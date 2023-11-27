import {CompletionContext, snippetCompletion as snip,completeFromList} from "@codemirror/autocomplete"
import {syntaxTree} from "@codemirror/language";
import {SyntaxNode} from "@lezer/common"
import {pythonLanguage} from "@codemirror/lang-python";



export const arrayComp  =  completeFromList([
    snip( "atom\nclass ${className}:\n\t${value}: ${type}\n", {
      label: `atom`,
      detail: `Atom class`,
      type: "class",
      boost: 99
    }),
    {
      label: "When",
      detail: "When rule",
      type: "class",
    },
    {
        label: "Assert",
        detail: "Assert rule",
        type: "class"
    },
    {
        label: "Count",
        detail: "Count rule",
        type: "class"
    },
    {
        label: "Guest",
        detail: "Guest rule",
        type: "class"
    },

])


export interface Atom
{
    name : String
    fields : Map<String,String>
    getTemplate() : string
    getDetail() : string
    from: number,
    to: number
}


export class BaseAtom implements Atom
{
    fields: Map<String, String>;
    name: String;
    from: number;
    to: number;

    constructor(name: String, fields : Map<String,String>,from : number,to: number) {
        this.name = name
        this.fields = fields
        this.from = from;
        this.to = to
    }

    getTemplate(): string {
        return `${this.name}(${Array.from(this.fields.entries()).map(value => `${value[0]}=\${${value[1]}}`).join(",")})`;
    }

    getDetail()
    {
        return `(${Array.from(this.fields.entries()).map(value => `${value[0]}: ${value[1]}`).join(",")})`;
    }

}
