# Evaluation Report

## Overall
- Accuracy: 0.8611111111111112
- Macro-F1: 0.8173913042755077
- Test size: 72
- Below threshold: 10

## Per-class
| Class             | Precision | Recall | F1    | Support |
|-------------------|-----------|--------|-------|---------|
| greeting          | 1.000     | 1.000  | 1.000 | 3       |
| goodbye           | 1.000     | 0.667  | 0.800 | 3       |
| thanks            | 1.000     | 0.667  | 0.800 | 3       |
| how_are_you       | 1.000     | 1.000  | 1.000 | 3       |
| bot_identity      | 1.000     | 0.667  | 0.800 | 3       |
| bot_creator       | 1.000     | 1.000  | 1.000 | 3       |
| capabilities      | 1.000     | 0.333  | 0.500 | 3       |
| help              | 1.000     | 0.667  | 0.800 | 3       |
| introduce_name    | 1.000     | 1.000  | 1.000 | 12      |
| ask_my_name       | 1.000     | 0.667  | 0.800 | 3       |
| get_time          | 1.000     | 1.000  | 1.000 | 3       |
| get_date          | 1.000     | 1.000  | 1.000 | 3       |
| simple_math       | 1.000     | 1.000  | 1.000 | 3       |
| tell_joke         | 1.000     | 0.333  | 0.500 | 3       |
| compliment        | 1.000     | 1.000  | 1.000 | 3       |
| insult            | 1.000     | 1.000  | 1.000 | 3       |
| affirm            | 1.000     | 1.000  | 1.000 | 3       |
| deny              | 1.000     | 1.000  | 1.000 | 3       |
| weather_smalltalk | 1.000     | 0.667  | 0.800 | 3       |
| small_talk_hobby  | 1.000     | 1.000  | 1.000 | 3       |
| age               | 1.000     | 1.000  | 1.000 | 3       |
| unknown           | 0.000     | 0.000  | 0.000 | 0       |
| knowledge_qa      | 0.000     | 0.000  | 0.000 | 0       |

## Confusion Matrix

| | greeting | goodbye | thanks | how_are_you | bot_identity | bot_creator | capabilities | help | introduce_name | ask_my_name | get_time | get_date | simple_math | tell_joke | compliment | insult | affirm | deny | weather_smalltalk | small_talk_hobby | age | unknown | knowledge_qa |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| greeting | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| goodbye | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| thanks | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| how_are_you | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| bot_identity | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| bot_creator | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| capabilities | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| help | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| introduce_name | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ask_my_name | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| get_time | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| get_date | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| simple_math | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| tell_joke | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| compliment | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| insult | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| affirm | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| deny | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| weather_smalltalk | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 1 | 0 |
| small_talk_hobby | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 |
| age | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| unknown | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| knowledge_qa | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Misclassified

- "i need to head out now" -> predicted unknown, actual goodbye (conf 0.35936800652222567)
- "much obliged" -> predicted unknown, actual thanks (conf 0.39339706582362083)
- "who am i speaking with" -> predicted unknown, actual bot_identity (conf 0.44458267573868565)
- "list everything you can do" -> predicted knowledge_qa, actual capabilities (conf 0.35634947160963115)
- "show me your skills" -> predicted unknown, actual capabilities (conf 0.40432262742285185)
- "how should i interact with you" -> predicted unknown, actual help (conf 0.21267674900279773)
- "what name do you have for me" -> predicted knowledge_qa, actual ask_my_name (conf 0.3675848962492023)
- "do you have a humorous story" -> predicted unknown, actual tell_joke (conf 0.3563154604988362)
- "i need a good laugh" -> predicted unknown, actual tell_joke (conf 0.34104486745509716)
- "should i pack a jacket" -> predicted unknown, actual weather_smalltalk (conf 0.1948022294862192)
