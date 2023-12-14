import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import {basicSetup} from "codemirror";
import {amy, birdsOfParadise} from "thememirror";
import {globalCompletion, localCompletionSource, pythonLanguage} from "@codemirror/lang-python";
import {LanguageSupport, syntaxTree, indentUnit} from "@codemirror/language"
import {CompletionContext, snippetCompletion as snip} from "@codemirror/autocomplete"
import {EditorView, keymap} from "@codemirror/view"
import {EditorState,Compartment} from "@codemirror/state"
import {Diagnostic, linter} from "@codemirror/lint"
import {arrayComp} from "../service/completions";
import { Atom } from "../model/model";
import {indentWithTab} from "@codemirror/commands"
import {SyntaxNode, SyntaxNodeRef} from "@lezer/common";
import { SocketService } from '../service/code/socket.service';
import { CodeDiagnostic } from '../model/model';
import { EditorTheme, SettingsService, editorThemes } from '../service/settings/settings.service';
import { endWith } from 'rxjs';


@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {

  editor ?: EditorView


  currentAtoms : Atom[] = []
  diagnostics: CodeDiagnostic[] = []

  //compartments
  linterCompartment = new Compartment()
  tabSizeCompartment = new Compartment()
  editorThemeCompartment = new Compartment()

  isCodeWriting: boolean = false;

  //LINTERS
  getCodeLinter()
  {
    return linter(view => {
      return this.diagnostics.map<Diagnostic>(diagnostic => {
        const from = view.state.doc.line(diagnostic.range.start.line + 1).from + diagnostic.range.start.character
        const to = Math.min(view.state.doc.line(diagnostic.range.end.line + 1).from + diagnostic.range.end.character,view.state.doc.length)
        return {from: from,to: to,severity: diagnostic.severity,message: diagnostic.message}
      });
    })
  }
  syntaxLinter = linter(view => {
    return this.syntaxErrors.map<Diagnostic>(error => {
        return {from: error.from,to: error.to,severity: "error",message: error.error}
    });
  })
  syntaxErrors : {error: string,from: number,to: number}[] = []


  constructor (public socketService: SocketService, private settingsService: SettingsService)
  {
    socketService.sandboxCode.subscribe(code => {
      this.editor!.dispatch(this.editor!.state.update({changes: {from: 0,insert: code}}))
    })
    socketService.codeDiagnostics.subscribe(diagnostics => {
      this.diagnostics = diagnostics
      this.editor?.dispatch({effects: this.linterCompartment.reconfigure(this.getCodeLinter())})
    })
    this.settingsService.tabSize.subscribe(size => {
      this.editor?.dispatch({effects: this.tabSizeCompartment.reconfigure(indentUnit.of(" ".repeat(size)))});
    })
    this.settingsService.editorTheme.subscribe(theme => {
      this.editor?.dispatch({effects: this.editorThemeCompartment.reconfigure(editorThemes.get(theme))});
    })

    this.socketService.writing.subscribe(writing => this.isCodeWriting = writing)

  }

  ngOnInit(): void {
    let updateOnChange = EditorView.updateListener.of(update => {
      if(update.docChanged) {
          update.changes.iterChanges((fromA,toA,fromB,toB,inserted) => {
              this.socketService.sendEditorCode({from: fromA,to: toA,value: inserted.toString()})
          },true)
          this.onEditorUpdate(update.state)
      }
    })


    const atomCompletion = (context: CompletionContext) => {
        let word = context.matchBefore(/\w*/)
        if (word == null || word.from == word.to && !context.explicit)
            return null
        return {
            from: word.from,
            options: this.currentAtoms.map(atom => {

                return snip( atom.getTemplate(), {
                    label: `${atom.name.name}`,
                    detail: atom.getDetail(),
                    type: "class",
                    boost: 99
                })
            })
        }
    }

    const editorState = EditorState.create({
        extensions: [basicSetup,
            this.editorThemeCompartment.of(editorThemes.get(this.settingsService.editorThemeValue)),
            new LanguageSupport(pythonLanguage, [
                pythonLanguage.data.of({autocomplete: globalCompletion}),
                pythonLanguage.data.of({autocomplete: localCompletionSource}),
                pythonLanguage.data.of({autocomplete: atomCompletion}),
                pythonLanguage.data.of({autocomplete: arrayComp}),
                keymap.of([indentWithTab]),
                updateOnChange
            ]),
            this.syntaxLinter,
            this.linterCompartment.of(this.getCodeLinter()),
            this.tabSizeCompartment.of(indentUnit.of(" ".repeat(this.settingsService.tabSizeValue)))
          ]
    })


    this.editor = new EditorView({
        state: editorState,
        parent: document.getElementById("editor")!!
    })
  }

  private onEditorUpdate(state : EditorState)
  {

      this.currentAtoms = []
      this.syntaxErrors = []
      let validAtomNames = ["atom"]
      const topNode = syntaxTree(state).topNode
      let currentNode = topNode.firstChild

      //FIND ATOM IMPORTS
      topNode.getChildren("ImportStatement").forEach(a => {
        const asNode = a.getChild("as")
        if(asNode && asNode?.prevSibling && asNode.nextSibling)
        {
          if(stringFromNode(state,asNode.prevSibling) == "atom")
          {
            const atomImport = stringFromNode(state,asNode.nextSibling)
            if(atomImport.length > 0)
              validAtomNames.push(atomImport)
          }
        }
      })
      while(currentNode != null)
      {
        const atom = this.checkAtom(validAtomNames,state,currentNode);
        if(atom)
          this.currentAtoms.push(atom)
        currentNode = currentNode.nextSibling
      }

  }

  addNewAtom() : void
  {
    if(!this.editor) return;

    const lastImportStatement = syntaxTree(this.editor.state).topNode.getChildren("ImportStatement").at(-1)

    const lastAtom = this.currentAtoms.at(-1)
    const tab = " ".repeat(this.editor.state.tabSize - 2)
    const newAtom = `${lastImportStatement && !lastAtom ? "\n" : ""}@atom\nclass newAtom${this.currentAtoms.length}:\n${tab}field: any\n`
    let transaction = this.editor.state.update({changes: {from: lastAtom?.node.to || lastImportStatement?.node.to || 0, insert: newAtom}})
    this.editor.dispatch(transaction)
  }

  isValidType(str: String)
  {
      return baseTypes.find(type => type == str) != null || this.currentAtoms.find(atom => atom.name.name == str)
  }

  checkAtom(atomNames: string[], state: EditorState,nodeToCheck : SyntaxNode): Atom | null
  {
    if(nodeToCheck.name !== "DecoratedStatement")
      return null;
    const decoratedNode = nodeToCheck.node.firstChild


    if(decoratedNode && decoratedNode.name == "Decorator" && decoratedNode.node.nextSibling?.name == "ClassDefinition")
    {
        const classNode = decoratedNode.node.nextSibling
        const decoratorName = stringFromNode(state,decoratedNode).trim()

        if(atomNames.find((val) => decoratorName.endsWith(val))) {


            const nameNode = classNode.getChild("VariableName")
            if(!nameNode)
              return null;
            const atomName = stringFromNode(state,nameNode)
            const fields = new Map()
            const assignments = classNode.getChild("Body")?.getChildren("AssignStatement")
            if(assignments)
            {
                for (let assign of assignments) {

                    const fieldName = stringFromNode(state, assign.getChild("VariableName"))
                    const fieldType = stringFromNode(state, assign.getChild("TypeDef")?.getChild("VariableName"))

                    if (!fieldType) {
                        this.syntaxErrors.push({error: "Missing Type", from: assign.from, to: assign.to})
                        return null
                    } else if (!this.isValidType(fieldType)) {
                        this.syntaxErrors.push({error: "Invalid Type", from: assign.from, to: assign.to})
                        return null
                    }

                    fields.set(fieldName, fieldType)
                }
            }
            if(fields.size == 0)
            {
                this.syntaxErrors.push({error: "Missing Values", from: classNode.from, to: classNode.to})
                return null
            }

            return new Atom({from: nameNode.from,to: nameNode.to,name: atomName}, fields,nodeToCheck)
        }
    }
    return null
  }
}
export function stringFromNode(state: EditorState, node?: SyntaxNode | null): string
{
  if(node == null)
      return ""

  return state.sliceDoc(node?.from,node?.to)
}


export const baseTypes = ["int","str","any"]

