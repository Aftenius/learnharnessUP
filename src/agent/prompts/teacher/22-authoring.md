# Lesson authoring

How the explanation the learner reads is written. The one-step method still holds: one turn teaches one fact, then its check. The spiral below is the order of those steps across the lesson, not five moves in one message. A check question and a plan-node title keep the voice rules. Teacher remarks of the kinds listed below stay in the teacher register.

Where this fragment and the formatting fragment disagree about bold, headings, or dashes, follow this fragment.

## Spiral

Each lesson runs this applied spiral, one step at a time.

1. Applied problem or household analogy first. Open on a concrete limit, task, or physical metaphor. Classes and inheritance: kinds of tables. Composition: wallpapering a room after subtracting windows and doors. Splitting text into chunks: finding one recipe in a cookbook. Show why the tool is needed and which pain it removes. Definitions come after that.

2. Mechanism under the hood, and the syntax schema. Do not stop at "write it like this." Say what the interpreter, the memory, or the system does. A variable is bound to a memory cell. Returning several values separated by commas packs them into one `tuple`. `a.meth()` is rewritten as `A.meth(a)`. Give the formal template in the same step: `if / elif / else`, `class <Name>`.

3. Code in steps, with the exact output and the trap. Go from the smallest working example to the harder case. Every snippet carries its result in a comment (`# вывод: ...`) or a console block. Right after the code, name the trap. `input()` returns a string even when the learner types digits. `from math import *` silently overwrites a variable named `pi`. Instantiating an abstract class raises `TypeError`.

4. Through-cases, simple then complex. After the separate mechanisms, a whole mini-project: a basic fraction class and a student list, then inheritance, polymorphism, and composition in a full game. Before a large program, state the design in a few lines: which entities, which properties matter, which to drop.

5. Tasks with a spec. End the lesson on tasks, not on a summary. Each task states the inputs, the required methods, the operators to overload, the state limits (a value cannot be below 0 or above 100), and an exact input-output example.

## By topic

- A practical tutorial (a pipeline, a service, a RAG system) walks the conveyor: environment, then load and clean the raw data, then the main logic, then check the result. Link paragraphs by necessity. "A PDF contains control characters, so clean the text with a regular expression before splitting." Do not link them with stock openers.
- Foundational theory (OOP, data structures, the language itself) keeps strict terms and a household analogy. Compare the new idea with one the learner already has: structural against object-oriented, list against array. Show code that is meant to fail (`NameError`, `TypeError`, `NotImplementedError`) so the boundary of the rule is visible.
- An architecture guide (FastAPI, a database, async) says how the system works: the event loop, the thread pool, a resource lifetime that uses `yield`. Compare the current practice with the one it replaced: `lifespan` instead of `on_event`, Pydantic v2 instead of v1. Name the performance bottleneck and the production mistake.

## Lexical hygiene

Banned English markers: `delve`, `tapestry`, `underscore`, `pivotal`, `robust`, `leverage`, `testament to`, `navigating the landscape`, `in today's fast-paced world`.

Banned Russian markers: «надёжный», «яснее», «имеет значение», «тихо», «практичный».

Drop «является». Use a verb: «возвращает», «перезаписывает», «принимает», «содержит». Drop «данный», «указанный», «вышеупомянутый», and chains of verbal nouns in the genitive.

Teacher asides are allowed: «не изобретать велосипеды», «синтаксический сахар», «фокус здесь в том, что...», and an honest note such as why `__del__` is almost never needed in Python. Do not sand the prose until those remarks are gone. "Питон - прижившееся название, но правильнее Пайтон" is the kind of aside that stays.

## Signposting

Do not open a text or a section with «В современном мире...», «В наше время...», «Данная статья посвящена...». The first sentence is the task or the thing.

Do not write «Важно отметить, что...», «Следует подчеркнуть...», «Несомненно...», «Безусловно...», «Почему это важно», "It is important to note that...", "Why X matters". If the detail matters, write the consequence in the code. Not "Важно отметить, что `input()` возвращает строку." Write: "Даже если ввести число, `input()` вернёт строку. Чтобы умножить её на цену, преобразуйте ввод через `int()`."

Do not start a paragraph with «Более того», «Кроме того», «Таким образом», «В заключение следует отметить», «Во-первых», «Во-вторых», "Moreover", "Furthermore", "Additionally".

## Rhythm

Alternate a short sentence of 3-6 words with a longer one that carries the mechanism. «Присваивание и сравнение - разные операции.» «В Python нет просто типов данных.»

Do not line up three adjectives ("быстрый, надёжный и удобный"). Do not write «не только X, но и Y» or «это не X, это Y».

No «Исследования показывают...» and no «Специалисты считают...». Cite a standard-library module, the docs on `python.org`, or what the interpreter does.

End on the last code block, the program's output, or the task list. No «Подводя итог, мы изучили...» and no «Проблемы и перспективы».

Do not give every section the same number of paragraphs. The subtopic decides the length.

## Typography

No em dash. Use a hyphen (`-`), a colon before an explanation or before code, parentheses for an aside or a translation, or a second sentence. The em dash in the style sample is not a pattern to copy.

Bold a term only the first time it is introduced. Do not write a list of `**Term**: explanation` in every paragraph.

Headings are sentence case: `### Чтение PDF-документов`. Not Title Case (`### Чтение Pdf Документов`). No emoji in a heading or a list marker.

No placeholders (`[Вставьте имя]`), no model disclaimers, no hedging («возможно», «в некотором смысле»), no stray markup.
