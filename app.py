

import glob
import shutil
from time import sleep
from click import Context
from flask import Flask,request,jsonify
from pyspel import pyspel
from flask_cors import CORS
import subprocess
import socketio
import sandbox

sio = socketio.AsyncServer()

app = Flask(__name__)
socketio.WSGIApp(sio, app)

CORS(app)
@app.route('/api/v1/pyspel', methods=['POST'])
def data():

    content_type = request.headers.get('Content-Type')
    if content_type == 'application/json':
        json = request.json
        code = json['code']
        
        id = sandbox.init()
        response = jsonify(sandbox.runCode(id,code))
        sandbox.cleanSandbox(id)
        return response
    return "no"


@sio.event
def onCodeSent(sid, data):

    print(data)
    pass

def init():

    sandbox.init()

    id = sandbox.initSandbox()

    print(f"init sandbox {id}")
    print(sandbox.runCode(id,"print(\"apogus\""))
    app.run()

if __name__ == '__main__':
    init()
