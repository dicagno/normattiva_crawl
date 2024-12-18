import spacy
from spacy.lang.it.stop_words import STOP_WORDS
import json
import glob
import os

# Step 1: Open and read the JSON file
with open('/Users/adicagno/Dropbox/Applicazioni/normattiva-crawl/normattiva-crawl/article-1ac0f9db98dbbd273828a6b5b8cd7ba56b911d3b8d5f305c42fbe278bd703fc2.json', 'r') as file:
    data = json.load(file)  # Load JSON content into a Python dictionary

# Step 2: Access a specific property

# 1. Load blank Italian NLP model
nlp = spacy.blank("it")

# 2. Add sentencizer to the pipeline
nlp.add_pipe("sentencizer")

# 3. Define custom stopword list
# Remove legal terms like "Art.", "comma", "legge" from stopwords if needed
legal_stopwords = STOP_WORDS - {"art", "comma", "legge", "dlgs"}

# 4. Add custom tokenization rules for legal abbreviations
legal_abbreviations = ["Art.", "art.", "c.", "D.Lgs.", "Legge"]
for abbr in legal_abbreviations:
    nlp.tokenizer.add_special_case(abbr, [{spacy.attrs.ORTH: abbr}])

# Function to split and process legal text
def process_legal_text(data):
    text = data["content"]
    metadata = data["metadata"]

    # Apply the NLP pipeline
    doc = nlp(text)
    
    sentences = []
    for sent in doc.sents:
        # Tokenize and remove stopwords
        filtered_tokens = [
            token.text for token in sent 
            if token.text.lower() not in legal_stopwords and not token.is_punct
        ]
        # Reconstruct the filtered sentence
        sentences.append(" ".join(filtered_tokens))
    
    processed_sentences = [
        sentence.replace("\\n", ' ').replace('\n', ' ').strip() for sentence in sentences
        if len(sentence.split()) >= 10
    ]

    metadata["link"] = metadata["link"].strip()
    metadata["title"] = metadata["title"].strip()

    return {
        "metadata": metadata,
        "sentences": processed_sentences
    }


#with open("data.json", "w") as file:
#    json.dump(data, file, indent=4)

for filepath in glob.glob("/Users/adicagno/Dropbox/Applicazioni/normattiva-crawl/normattiva-crawl/article-*.json"):
    try:
        # Read the JSON file
        with open(filepath, 'r') as file:
            data = json.load(file)

        # Process the JSON content
        processed_data = process_legal_text(data)
        
        # Construct the output filename
        dirname, basename = os.path.split(filepath)
        output_filename = os.path.join(
          dirname, basename.replace("article-", "article_nlped-")
        )

        # # Write the processed data to the new file
        with open(output_filename, 'w') as file:
            json.dump(processed_data, file, indent=4)

        print(f"Processed {filepath} and saved to {output_filename}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")