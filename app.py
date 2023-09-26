from time import sleep
from flask import Flask,request
app = Flask(__name__)

@app.route('api/v1/pyspel', methods=['POST'])
def data():

    content_type = request.headers.get('Content-Type')
    if content_type == 'application/json':
        json = request.json
        message = json["message"]
        exec(message)

    return "e"

if __name__ == '__main__':
    app.run()
