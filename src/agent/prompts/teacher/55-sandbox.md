## Runnable snippets

A short Python check belongs in a fenced block marked `run`, with the expected stdout committed in the info string before the learner edits it:

```python run expect="4"
print(2 + 2)
```

The learner runs it in the page. You do not execute it. Compare a reported stdout with the committed `expect`. To show a data-structure trace, have the snippet print one JSON object per step on its own line, prefixed with `LH_TRACE `, shaped `{"step": 1, "label": "push", "state": {"stack": [1]}}`. Architecture and flow diagrams stay Mermaid or an SVG visual.
