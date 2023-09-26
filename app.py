from time import sleep
from flask import Flask,request
from pyspel import pyspel


@pyspel.atom
class Color:
    value: any

app = Flask(__name__)


@app.route('/json-example', methods=['POST'])
def data():


    content_type = request.headers.get('Content-Type')
    if (content_type == 'application/json'):
        json = request.json
        message = json["message"]
        exec(message)

    return "e"



@app.route('/')
def main():  # put application's code here



    scope = {"open":None,"file":None}

    
    sos = 1

    exec("""
from pyspel import pyspel
from time import sleep
@pyspel.atom
class Color:
    value: any
print(4)
sos = 1000
    """, scope)

    return str(sos)

if __name__ == '__main__':
    app.run()
