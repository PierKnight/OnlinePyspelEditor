import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { amy, ayuLight, birdsOfParadise, dracula } from 'thememirror';
import {materialLight} from '@ddietr/codemirror-themes/material-light'
import {materialDark} from '@ddietr/codemirror-themes/material-dark'
import {githubLight} from '@ddietr/codemirror-themes/github-light'
import {githubDark} from '@ddietr/codemirror-themes/github-dark'

@Injectable({
  providedIn: 'root'
})
export class SettingsService {


  private _mode: BehaviorSubject<Mode>
  public mode;

  private _tabSize: BehaviorSubject<number>
  public tabSize

  private _editorTheme: BehaviorSubject<EditorTheme>
  public editorTheme


  constructor() {
    this._mode = new BehaviorSubject<Mode>((localStorage.getItem("mode") || "light") as Mode)
    this.mode = this._mode.asObservable()

    this._tabSize = new BehaviorSubject<number>(Number.parseInt(localStorage.getItem("tabSize") || "4"))
    this.tabSize = this._tabSize.asObservable()

    this._editorTheme = new BehaviorSubject<EditorTheme>((localStorage.getItem("editorTheme") || "amy") as EditorTheme)
    this.editorTheme = this._editorTheme.asObservable()
  }


  updateMode(mode: Mode)
  {
    this._mode.next(mode)
    localStorage.setItem("mode",mode)
    this.updateEditorTheme(mode == "dark" ? "githubDark" : "githubLight")
  }

  switchMode()
  {
    if(this._mode.value == "light")
      this.updateMode("dark")
    else
      this.updateMode("light")
  }

  updateSize(tabSize: number)
  {
    if(!tabSize || tabSize <= 0)
    {
      console.log("Invalid TabSize")
      return;
    }

    this._tabSize.next(tabSize)
    localStorage.setItem("tabSize",`${tabSize}`)
  }

  updateEditorTheme(editorTheme: EditorTheme)
  {
    this._editorTheme.next(editorTheme)
    localStorage.setItem("editorTheme",editorTheme)
  }

  get modeValue(): Mode { return this._mode.value}
  get tabSizeValue(): number { return this._tabSize.value}
  get editorThemeValue(): EditorTheme { return this._editorTheme.value}

}


export type Mode = "light" | "dark"
export type EditorTheme =
  "amy" |
  "birds" |
  "ayuLight" |
  "dracula" |
  "materialLight" |
  "materialDark" |
  "githubLight" |
  "githubDark"


export const editorThemes = new Map<EditorTheme,any>([
  ["materialLight", materialLight],
  ["materialDark", materialDark],
  ['amy', amy],
  ['birds', birdsOfParadise],
  ["ayuLight", ayuLight],
  ["dracula", dracula],
  ["githubLight", githubLight],
  ["githubDark", githubDark]
]);
