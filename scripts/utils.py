import json


def parse_model_response(response):
    if not response:
        print("Error: Received an empty response from the model.")
        return None
    if isinstance(response, dict):
        return response
    try:
        # Ensure the model response contains the expected delimiters
        if '```json' not in response:
            print("Error: Response format unexpected. Missing '```json' delimiter.")
            return None
        response_str = response.split('```json')[1].split('```')[0].strip()
        response_str = response_str.replace("\\\\", "\\")
    except IndexError as e:
        print("Error processing the model's response:", e)
        return None
    try:
        quiz_data = json.loads(response_str)
        return quiz_data
    except json.JSONDecodeError as e:
        print("Error decoding JSON from the model's response:", e)
        return None