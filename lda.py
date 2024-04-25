import sys
import json
from gensim import corpora, models
from nltk.corpus import stopwords
from nltk.stem.wordnet import WordNetLemmatizer
import string

def generate_tags_lda(text, num_topics=1, num_words=5):
    # Preprocess the text
    stop = set(stopwords.words('english'))
    exclude = set(string.punctuation)
    lemma = WordNetLemmatizer()
    def clean(doc):
        stop_free = " ".join([i for i in doc.lower().split() if i not in stop])
        punc_free = ''.join(ch for ch in stop_free if ch not in exclude)
        normalized = " ".join(lemma.lemmatize(word) for word in punc_free.split())
        return normalized

    doc_clean = [clean(doc).split() for doc in text]     

    # Create the term dictionary of our corpus, where every unique term is assigned an index
    dictionary = corpora.Dictionary(doc_clean)

    # Convert list of documents (corpus) into Document Term Matrix using dictionary prepared above
    doc_term_matrix = [dictionary.doc2bow(doc) for doc in doc_clean]

    # Create the object for LDA model using gensim library
    Lda = models.LdaModel

    # Run and train LDA model on the document term matrix
    ldamodel = Lda(doc_term_matrix, num_topics=num_topics, id2word = dictionary, passes=50)

    # Generate the topics
    topics = ldamodel.print_topics(num_topics=num_topics, num_words=num_words)

    # Extract the tags from the topics
    tags = []
    for topic in topics:
        words = topic[1].split("+")
        for word in words:
            tag = word.split("*")[1].replace(" ","").replace('"', '')
            tags.append(tag)

    return tags

if __name__ == "__main__":
    # Read the input arguments
    text = sys.argv[1]

    # Generate the tags
    try:
        tags = generate_tags_lda([text])
    except Exception as e:
        print(f"Error occurred: {e}")  # Print any error that occurs
        sys.exit(1)

    # Print the tags as a JSON string
    print(json.dumps(tags))