import http.server
import socketserver
import urllib.request
import urllib.error
import json
import sys
import os

PORT = 8000

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/proxy':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                target_url = data.get('target_url')
                headers = data.get('headers', {})
                body = data.get('body', {})
                
                if not target_url:
                    self.send_error(400, "Missing target_url")
                    return

                # Prepare Request
                req = urllib.request.Request(
                    target_url, 
                    data=json.dumps(body).encode('utf-8'),
                    headers=headers,
                    method='POST'
                )

                # Send Request
                with urllib.request.urlopen(req) as response:
                    resp_data = response.read()
                    self.send_response(response.status)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(resp_data)

            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404, "Not Found")

    def do_GET(self):
        if self.path.startswith('/api/download'):
            try:
                # Parse URL parameter
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(self.path)
                params = parse_qs(parsed.query)
                image_url = params.get('url', [None])[0]
                
                if not image_url:
                    self.send_error(400, "Missing url parameter")
                    return
                
                # Fetch the image
                req = urllib.request.Request(image_url)
                with urllib.request.urlopen(req) as response:
                    image_data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/png')
                    self.send_header('Content-Disposition', 'attachment; filename="image.png"')
                    self.end_headers()
                    self.wfile.write(image_data)
                    
            except Exception as e:
                self.send_error(500, str(e))
        else:
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

print(f"Starting BananaPrinter Server at http://localhost:{PORT}")
print("Close this window to stop the server.")

with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
