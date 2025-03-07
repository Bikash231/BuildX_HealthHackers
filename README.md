# BuildX-Voovo Hackathon
February 28 - March 2, 2025

## Solution by the Health Hackers Team
This is the repository for the Health Hackers team for the Buildx-Voovo hackathon. The team has developed an AI-driven automated workflow that generates structured, high-quality revision quizzes from different medical content sources, to enhance medical students' learning and retention.

## Team Members
- Gabriella Feliciano ("The Eyes" - graphics design and project organization)
- Kris Bertalan ("The Brain" - implementation, data science and machine learning)
- Bikash Kumar Mahanti ("The Voice" - data science and machine learning)
- Marin Balabanov ("The Beard" - organization and presentation )

## Running the Script
Go to the `scripts` directory, enter your API key at the end of `script/app.py` file, install and run the script using the following commands:

```bash
pip install -r requirements.txt
python scripts/app.py
```

(You might have to use `python3` instead of `python` depending on your system configuration.)

You can run the script using Python 3.8 or later. It uses Google's Gemini model and generates the output in the `outputs` directory.

The other experiments that were **discarded** during discovery and developmnenet are in the directories that start with `z_deprecated-`.

## Output
The generated revision questions and answers as JSON are in the `outputs` directory.

## Slide Deck
The slide deck with the presentation is available at [Health Hackers Presentation](Health%20Hackers%20Presentation.pdf).

## Other TO DOs

- [x] Submission is in the `main` branch
- [x] invite @matteohorvath - <https://github.com/matteohorvath>

## Problem description
<https://voovo.craft.me/Z3TCJ7hxzd7p6r>
