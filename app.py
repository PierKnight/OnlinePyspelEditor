from time import sleep
from flask import Flask,request,jsonify
from pyspel import pyspel
from flask_cors import CORS
import subprocess
app = Flask(__name__)

CORS(app)

@app.route('/api/v1/pyspel', methods=['POST'])
def data():

    content_type = request.headers.get('Content-Type')
    if content_type == 'application/json':
        json = request.json
        message = json['code']
        print(message)
        result = subprocess.run(["c:/modding/flask/venv/Scripts/python.exe","-c",message], capture_output=True,text=True)

        print(result.stdout)
        return jsonify({
            "result": result.stdout,
            "error": result.stderr
        })
    return "no"

if __name__ == '__main__':
    app.run()
