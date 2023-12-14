import {Completion, snippetCompletion as snip,completeFromList} from "@codemirror/autocomplete"
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
    snip( "When(${condition})", {
      label: `When`,
      detail: `When rule`,
      type: "class",
      boost: 99
    }),
    snip( "Assert(${disjunction})", {
      label: `Assert`,
      detail: `Assert rule`,
      type: "class",
      boost: 99
    }),
    snip( "Guess(${head},${exactly},${at_least},${at_most})", {
      label: `Guess`,
      detail: `Guess rule`,
      type: "class",
      boost: 99
    }),
    ...["Count","Min","Max","Sum"].map(aggregate =>
      snip( `${aggregate}(\${elements})`, {
        label: `${aggregate}`,
        detail: `${aggregate} rule`,
        type: "class",
        boost: 99,
        section: "aggregate"
      })
    ),
    getSolverCode(),
    snip(`Problem()`, {
      label: 'Problem',
      detail: 'Model to describe the program',
      type: 'class'
    }),
    ...["NO_SOLUTION ","HAS_SOLUTION","UNKNOWN"].map(result => `Result.${result}`),
    snip(`from pyspel.pyspel import *`, {
      label: 'import pyspel',
      detail: 'Default pyspel import',
      type: 'import'
    }),

])

function getSolverCode()
{
  return snip(`
p = Problem()
solver = SolverWrapper(solver_path="/usr/local/bin/clingo")
res = solver.solve(problem=p, timeout=10)
if res.status == Result.HAS_SOLUTION:
    assert len(res.answers) == 1
    answer = res.answers[0]
    \${#handle answer set}
    pass
elif res.status == Result.NO_SOLUTION:
    \${#handle no solution}
    pass
else:
  \${#handle unknown solution}
  pass`, {
    label: "Solver",
    detail: "code to execute program with pyspel",
    type: "method"
  })
}

