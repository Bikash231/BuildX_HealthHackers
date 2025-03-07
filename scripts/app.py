import re
from google import genai
from google.genai import types
import json
import os
import pathlib
import PyPDF2
import random

from utils import parse_model_response

QUIZ_EXAMPLE = {
    "question": "",
    "goodAnswer": "",
    "wrongAnswer_1": "",
    "wrongAnswer_2": "",
    "wrongAnswer_3": "",
    "wrongAnswer_4": ""
}

def generate_material_from_pdf(pdf_path, input_json_path, api_key):
    client = genai.Client(api_key=api_key)
    with open(input_json_path, 'r') as f:
        input_data = json.load(f)

    filepath = pathlib.Path(pdf_path)

    prompt = f"""
    You are an expert educator and content summarizer.

    Summarize the following document based on the provided topic structure.

    Topic structure:
    ```
    {json.dumps(input_data, indent=2)}
    ```

    Focus on the main topics and subtopics outlined in the structure. Ensure the summary is comprehensive and detailed, capturing the key information relevant to each topic.

    Provide the summary as a detailed text.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[
                types.Part.from_bytes(
                    data=filepath.read_bytes(),
                    mime_type='application/pdf',
                ),
                prompt
            ])

        return response.text
    except Exception as e:
        print(f"An error occurred during material generation: {e}")
        return None


def generate_single_quiz_from_material(material, input_json_path, api_key, previous_questions=None):
    client = genai.Client(api_key=api_key)
    with open(input_json_path, 'r') as f:
        input_data = json.load(f)

    if previous_questions is None:
        previous_questions = []

    prompt = f"""
    You are an expert educator and quiz generator.

    Generate a single highly complex revision multiple-choice question (quiz).
    
    The question and answers should follow medical standard taxonomy.
    ```
    {json.dumps(input_data, indent=2)}
    ``` 

    Base this question on the following material:
    
    ```
    {material}
    ```

    This question should be designed for MD(Medical Doctor) university students and require integrating three or more distinct pieces of information from the lecture notes to arrive at the final answer.
    
    Ensure that the question is unique, in-depth and emphasizes conceptual understanding.
    
    - For the question, provide five answer options in a **random order**.
    - One of these options must be the correct answer.
    - The remaining four options should be plausible distractors.
    - Ensure that all answer options—including both the correct answer and the distractors—are of nearly **identical length** (i.e., similar word count and phrasing) so that no option is conspicuously longer or shorter.
    - Make sure to use different interrogative words for each question.
    - Ensure that the generated question begins with a different interrogative word than those used in previous questions.
    - **Avoid generating questions that start with the same phrase as previous questions.**
    - **Avoid generating questions that are too similar in concept to previous questions.**

    Previous questions (to avoid duplication):
    ```
    {json.dumps(previous_questions, indent=2)}
    ```

    The output should be in the following format as a JSON:
    ```
    {json.dumps(QUIZ_EXAMPLE, indent=2)}
    ```
    """

    try:
        response = client.models.generate_content(
            model='tunedModels/medical-tuned-model-5865',
            contents=prompt)

        quiz_data = parse_model_response(response.text)

        return quiz_data
    except json.JSONDecodeError:
        print("Error: Could not decode the model's response as JSON.")
        print("Model's response:", response.text)
        return None
    except Exception as e:
        print(f"An error occurred during quiz generation: {e}")
        return None


def split_text(text, first=True):
    parts = text.split('-')
    if first:
        main_part = parts[0].strip()
        final_part = main_part.split('/')[0].strip()
        result = ''.join(char for char in final_part if ord(char) < 128)
        result = result.replace(' ', '_')
        result = re.sub('_+', '_', result).strip('_')
    else:
        parts = text.split('/')
        last_part = parts[-1].strip()
        result = ''.join(char for char in last_part if ord(char) < 128)
        result = result.replace(' ', '_')
        result = re.sub('_+', '_', result).strip('_')
    
    return result

def process_folder(base_folder, api_key):
    for root, _, files in os.walk(base_folder):
        json_file = None
        pdf_files = []
        
        for file in files:
            if file.endswith(".json"):
                json_file = os.path.join(root, file)
            elif file.endswith(".pdf"):
                pdf_files.append(os.path.join(root, file))

        if json_file and pdf_files:
            relative_path = os.path.relpath(root, base_folder)
            relative_path = split_text(relative_path, first=True)
            output_folder = os.path.join("outputs", relative_path)
            output_file = os.path.join(output_folder, split_text(json_file, first=False))
            output_file = output_file if output_file.endswith(".json") else output_file + ".json"
            if os.path.exists(output_file):
                print(f"Output already exists at {output_file}, skipping folder.")
                continue

            with open(json_file, 'r') as f:
                output_data = json.load(f)

            for subtopic in output_data["mainTopic"]["subTopics"]:
                material = generate_material_from_pdf(pdf_files[0], json_file, api_key)
                if material:
                    num_questions = random.randint(3, 14)
                    quizzes = []
                    previous_questions = [] # Track previous questions for duplication avoidance
                    for _ in range(num_questions):
                        quiz = generate_single_quiz_from_material(material, json_file, api_key, previous_questions)
                        if quiz:
                            quizzes.append(quiz)
                            previous_questions.append(quiz["question"]) # Add the new question to the list
                        else:
                            print(f"Quiz generation failed for subtopic: {subtopic['title']}")
                            quiz = generate_single_quiz_from_material(material, json_file, api_key, previous_questions)
                            if quiz:
                                quizzes.append(quiz)
                                previous_questions.append(quiz["question"])
                            else:
                                print(f"Quiz generation failed 2nd time for subtopic: {subtopic['title']}")
                                break
                    subtopic["quizzes"] = quizzes
                else:
                    print(f"Material generation failed for subtopic: {subtopic['title']}")

            os.makedirs(output_folder, exist_ok=True)
            with open(output_file, 'w') as f:
                json.dump(output_data, f, indent=2)
            with open(output_file, 'r') as f:
                data = json.load(f)
            data["mainTopic"]["team_name"] = "Health Hackers"
            with open(output_file, 'w') as f:
                json.dump(data, f, indent = 2)
            
            print(f"Quizzes generated and saved to {output_file}")

def main(base_folder, api_key):
    process_folder(base_folder, api_key)

if __name__ == "__main__":
    base_folder = "official_inputs"
    api_key = "AIzaSyDHbI458Q3Ldtftp1UJur_3EQTThUkkz9Q"
    main(base_folder, api_key)