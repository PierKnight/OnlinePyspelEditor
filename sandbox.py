



import glob
import shutil
import subprocess


sandBoxPath = "/var/local/lib/isolate/"

sandboxMap = {}

def init():
    print("Sandboxes Cleanup")
    for fl in glob.glob(f"{sandBoxPath}*"):
        shutil.rmtree(fl)



def cleanSandbox(id : int):
    shutil.rmtree(f"{sandBoxPath}{id}")


def runCode(id : int,sourceCode: str):
    result = subprocess.run(["isolate","-b",str(id),"--run","--", "/bin/python3", "-c",sourceCode],capture_output=True,text=True)
    return {"result" : result.stdout,"error": result.stderr}


def initSandbox() -> int:



    try:
        result = subprocess.run(["isolate","-b",str(len(sandboxMap)),"--init"],capture_output=True,text=True)
        if(len(result.stderr) != 0):
            raise subprocess.CalledProcessError(1,"")
        
        id = int(result.stdout.split("/")[-1])
        sandboxMap[id] = ""

        return id
    except subprocess.CalledProcessError:
        print("Failed to start sandbox")

    return -1

