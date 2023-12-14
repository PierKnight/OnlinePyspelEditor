import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Atom } from "../model/model";
import {SyntaxNode} from "@lezer/common";
import { baseTypes } from '../editor/editor.component';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { EditorView } from 'codemirror';

@Component({
  selector: 'app-atom',
  templateUrl: './atom.component.html',
  styleUrls: ['./atom.component.css']
})
export class AtomComponent  implements OnChanges {


  @Input() atoms : Atom[] = []

  @Input() atom: Atom = new Atom({name: "",from:0,to: 0}, new Map(),{name: "",from:0,to: 0})

  @Input() editorMode : boolean = false;

  @Input() collapable : boolean = true;

  @Input() collapsed : boolean = true;

  @Input() editor?: EditorView;

  atomForm = this.getGroup()


  fields : FormGroup[] = []

  ngOnChanges(changes: SimpleChanges): void {
    if(!changes["atom"]) return
    this.atomForm = this.getGroup()
  }

  private getGroup() : FormGroup
  {
    this.fields = []
    const atomForm = new FormGroup({})
    atomForm.addControl("name", new FormControl(this.atom.name.name,Validators.required))
    this.atom.fields.forEach((value,key) => {
      const group = new FormGroup({
        name: new FormControl(key,Validators.required),
        type: new FormControl(value,Validators.required)
      })
      atomForm.addControl(`${key}`,group)
      this.fields.push(group)

    })
    const inputField = new FormGroup({
      name: new FormControl("",Validators.required),
      type: new FormControl("any",Validators.required)

    })
    inputField.valueChanges.subscribe(e => { this.updateGroup(atomForm)})
    this.fields.push(inputField)
    atomForm.valueChanges.subscribe(e => {
      this.updateGroup(atomForm)
    })

    return atomForm
  }


  toggleCollapse()
  {
    if(this.collapable)
      this.collapsed = !this.collapsed
  }

  toggleEditorMode()
  {
    this.editorMode = !this.editorMode

  }

  updateGroup(fieldGroup: FormGroup)
  {
    if(fieldGroup.valid)
      this.writeOnEditor()
  }

  getTypes() : String[]
  {
    const types : String[] = [...baseTypes];

    for(let a of this.atoms)
    {
      if(a.node.from === this.atom.node.from)
        break
      else
        types.push(a.name.name)
    }

    return types
  }

  removeField(g: FormGroup)
  {
    this.fields = this.fields.filter(group => group != g)
    if(this.fields.length == 1)
      this.removeAtom()
    else
      this.writeOnEditor()

  }

  removeAtom()
  {
    if(!this.editor) return;

    const transaction = this.editor.state.update({changes: {from: this.atom.node.from,to: this.atom.node.to, insert: ""}})
    this.editor.dispatch(transaction)
  }




  writeOnEditor(){

  if(!this.editor || this.atomForm.invalid) return;

    const atomName = this.atomForm.controls['name'].value
    const tab = " ".repeat(this.editor.state.tabSize - 2)
    const fieldsString = `\n${tab}` + this.fields.filter(field => field.valid).map(field => `${field.controls["name"].value}: ${field.controls["type"].value}`).join(`\n${tab}`) + "\n"
    console.log(this.atom)

    let transaction = this.editor.state.update(
      {changes: {from: this.atom.name.from,to:this.atom.node.to, insert: `${atomName}:${fieldsString}`}},
    )
    this.editor.dispatch(transaction)
  }


  trackByMethod(index:number, el:FormGroup)
  {
    return index
  }

}
