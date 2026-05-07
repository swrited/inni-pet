#!/usr/bin/env python3
"""Inni 本地 ASR 服务 - faster-whisper"""
import base64
import json
import tempfile
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from faster_whisper import WhisperModel

# 加载模型
print("Loading faster-whisper model...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")
print("Model loaded!")

class ASRHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/asr":
            self.send_error(404, "Not found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body)
            audio_b64 = payload.get("audio", "")

            if not audio_b64:
                self.send_error(400, "No audio")
                return

            # 解码 base64 → 原始音频
            audio_bytes = base64.b64decode(audio_b64)
            
            # 保存原始音频文件
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp_path = tmp.name
                tmp.write(audio_bytes)
            
            print(f"[ASR] 收到音频大小: {len(audio_bytes)} bytes")

            # faster-whisper 可以直接处理 webm 格式
            segments, info = model.transcribe(
                tmp_path,
                language="zh",
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=300)
            )

            text = "".join(seg.text for seg in segments).strip()
            print(f"[ASR] → {text!r}")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"text": text}, ensure_ascii=False).encode("utf-8"))

        except Exception as e:
            print(f"[ASR] Error: {e}")
            import traceback; traceback.print_exc()
            self.send_error(500, str(e))
        finally:
            try: os.unlink(tmp_path)
            except: pass

    def log_message(self, fmt, *args):
        print(f"[ASR] {fmt % args}")

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 12434), ASRHandler)
    print("ASR server on http://0.0.0.0:12434 (faster-whisper tiny)")
    server.serve_forever()

