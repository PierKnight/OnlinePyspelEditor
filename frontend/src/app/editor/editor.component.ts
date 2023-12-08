import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import {basicSetup} from "codemirror";
import {amy} from "thememirror";
import {globalCompletion, localCompletionSource, pythonLanguage} from "@codemirror/lang-python";
import {LanguageSupport, syntaxTree, indentUnit} from "@codemirror/language"
import {CompletionContext, snippetCompletion as snip} from "@codemirror/autocomplete"
import {EditorView, keymap} from "@codemirror/view"
import {EditorState,Compartment} from "@codemirror/state"
import {Diagnostic, linter} from "@codemirror/lint"
import {arrayComp, Atom, BaseAtom} from "../service/completions";
import {indentWithTab} from "@codemirror/commands"
import {SyntaxNode, SyntaxNodeRef} from "@lezer/common";
import { SocketService } from '../service/code/socket.service';
import { CodeDiagnostic } from '../model/model';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {

  editor ?: EditorView


  currentAtoms : Atom[] = []


  @Input() prova: string = ""

  diagnostics: CodeDiagnostic[] = []

  //LINTERS
  getCodeLinter()
  {
    return linter(view => {
      return this.diagnostics.map<Diagnostic>(diagnostic => {
        const from = view.state.doc.line(diagnostic.range.start.line + 1).from + diagnostic.range.start.character
        const to = view.state.doc.line(diagnostic.range.end.line + 1).from + diagnostic.range.end.character
        return {from: from,to: to,severity: diagnostic.severity,message: diagnostic.message}
      });
    })
  }

  linterCompartment = new Compartment()

  regexpLinter = linter(view => {
    return this.syntaxErrors.map<Diagnostic>(error => {
        return {from: error.from,to: error.to,severity: "error",message: error.error}
    });
  })
  syntaxErrors : {error: string,from: number,to: number}[] = []



  constructor (public socketService: SocketService)
  {
    socketService.sandboxCode.subscribe(code => {
      this.editor!.dispatch(this.editor!.state.update({changes: {from: 0,insert: code}}))
    })
    socketService.codeDiagnostics.subscribe(diagnostics => {
      this.diagnostics = diagnostics
      this.editor?.dispatch({effects: this.linterCompartment.reconfigure(this.getCodeLinter())})
    })
  }

  ngOnInit(): void {
    let updateOnChange = EditorView.updateListener.of(update => {
      if(update.docChanged) {
          update.changes.iterChanges((fromA,toA,fromB,toB,inserted) => {
              //this.changes.push({from: fromA,to: toA,text: inserted.toString()})
              console.log({fromA: fromA,toA: toA,fromB: fromB, toB: toB, text: inserted.toString()})
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
                    label: `${atom.name}`,
                    detail: atom.getDetail(),
                    type: "class",
                    boost: 99
                })
            })
        }
    }
    const editorState = EditorState.create({
        extensions: [basicSetup,amy,
            new LanguageSupport(pythonLanguage, [
                pythonLanguage.data.of({autocomplete: globalCompletion}),
                pythonLanguage.data.of({autocomplete: localCompletionSource}),
                pythonLanguage.data.of({autocomplete: atomCompletion}),
                pythonLanguage.data.of({autocomplete: arrayComp}),
                keymap.of([indentWithTab]),
                updateOnChange
            ]),
            this.regexpLinter,
            this.linterCompartment.of(this.getCodeLinter())
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


      let currentNode = syntaxTree(state).topNode.firstChild
      while(currentNode != null)
      {
          const atom = this.checkAtom(state,currentNode);
          if(atom)
            this.currentAtoms.push(atom)
          currentNode = currentNode.nextSibling
      }

  }

  addNewAtom() : void
  {
    if(!this.editor) return;

    const a = syntaxTree(this.editor.state).topNode.getChildren("ImportStatement").at(-1)

    const tab = " ".repeat(this.editor.state.tabSize - 2)
    const newAtom = `\n@atom\nclass newAtom:\n${tab}field: any`
    const lastAtom = this.currentAtoms.at(-1)
    let transaction = this.editor.state.update({changes: {from: lastAtom?.to || a?.node.to || 0, insert: newAtom}})
    this.editor.dispatch(transaction)
  }


  isValidType(str: String)
  {
      return baseTypes.find(type => type == str) != null || this.currentAtoms.find(atom => atom.name == str)
  }

  checkAtom(state: EditorState,a : SyntaxNodeRef): Atom | null
  {
    if(a.name !== "DecoratedStatement")
      return null;
    const decoratedNode = a.node.firstChild

    if(decoratedNode && decoratedNode.name == "Decorator" && decoratedNode.node.nextSibling?.name == "ClassDefinition")
    {
        const classNode = decoratedNode.node.nextSibling
        const decoratorNameNode = decoratedNode.getChild("VariableName")
        const decoratorName = stringFromNode(state,decoratorNameNode)
        if(decoratorName == "atom") {

            const nameNode = classNode.getChild("VariableName")
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

            return new BaseAtom(atomName, fields,a.from,classNode.to)
        }
    }
    return null
  }
}
export function stringFromNode(state: EditorState, node?: SyntaxNode | null): String
{
  if(node == null)
      return ""

  return state.sliceDoc(node?.from,node?.to)
}

export const baseTypes = ["int","str","any"]

