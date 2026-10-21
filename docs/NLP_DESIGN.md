# NLP Design Document

## Overview
This chatbot implements a complete NLP pipeline from scratch in Node.js with no external NLP libraries.

## Components

1. Tokenizer & Normalizer - Unicode normalization, contraction expansion, slang mapping, tokenization
2. Stemmer - Porter stemming algorithm with all 5 steps
3. Edit Distance - Damerau-Levenshtein for spelling correction
4. Spell Correction - vocabulary-based with edit distance candidates
5. Vectorizer - TF-IDF with unigrams, bigrams, char-3grams, L2 normalization
6. Classifiers - Naive Bayes, Softmax Regression (SGD), kNN with cosine similarity
7. NER - Rule-based with gazetteers and patterns
8. Sentiment - Lexicon-based with negation, intensifiers, emphasis
9. Math Eval - Recursive descent parser for safe expression evaluation
10. Retrieval QA - TF-IDF based knowledge retrieval
11. Dialogue Manager - Context tracking, follow-ups, mood
12. Responder - Template selection with placeholders

All components are implemented from scratch using only JavaScript standard library.
