import http.server
import socketserver
import subprocess
import json

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Radius Reloaded")
        print("[RADIUS] Reload signal received via webhook. Restarting FreeRADIUS container...")
        subprocess.Popen(["killall", "radiusd"])

    def do_POST(self):
        if self.path == '/kick':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data)
                
                nasip = data.get("nasipaddress")
                secret = data.get("secret")
                attributes = data.get("attributes")
                
                cmd = f'echo "{attributes}" | radclient -x {nasip}:3799 disconnect {secret}'
                print(f"[RADIUS] Executing kick: {cmd}")
                
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                
                if result.returncode == 0:
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b'{"status":"success"}')
                else:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(json.dumps({"status":"error", "message": result.stderr}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"status":"error", "message": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(("", 8080), Handler) as httpd:
    httpd.serve_forever()
