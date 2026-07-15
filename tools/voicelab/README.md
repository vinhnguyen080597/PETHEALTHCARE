# VoiceLab

Ứng dụng **Text-to-Speech + Voice Cloning** chạy hoàn toàn trên máy (local), dựng
quanh model mã nguồn mở [OmniVoice](https://github.com/k2-fsa/OmniVoice) (Apache-2.0).
Không cần internet khi chạy, không license, không phụ thuộc dịch vụ ngoài.

## Tính năng
- **Giọng tự động** — nhập văn bản → sinh giọng nói (hỗ trợ tiếng Việt + nhiều ngôn ngữ).
- **Thiết kế giọng** — chọn giới tính / độ tuổi / cao độ / chất giọng vùng.
- **Clone giọng** — tải lên audio mẫu + nội dung của nó → tạo giọng tái sử dụng.
- **Thư viện giọng + Lịch sử** — nghe lại, tải về, xoá.

## Kiến trúc
- **Backend:** Python + FastAPI (`server.py`) — nạp model 1 lần, phục vụ REST API + frontend tĩnh.
- **Frontend:** HTML/CSS/JS thuần trong `static/` — không cần build, chạy offline.
- **Model:** OmniVoice tải sẵn ở `D:\omnivoice\model`.

## Chạy
```powershell
# Giữ dữ liệu chạy (audio/giọng clone/history) trên ổ D: cho nhẹ ổ C:
$env:VOICELAB_DATA = "D:\omnivoice\rundata"
D:\omnivoice\.venv\Scripts\python.exe "C:\Users\Administrator\Documents\PetHealthCare\tools\voicelab\server.py" --port 8850
```
Rồi mở http://127.0.0.1:8850

Tùy chọn / biến môi trường:
- `--device cuda:0` để dùng GPU (cần driver NVIDIA mới + torch bản CUDA).
- `--port 8850` đổi cổng.
- `VOICELAB_MODEL` — đường dẫn model (mặc định `D:\omnivoice\model`).
- `VOICELAB_DATA` — nơi lưu dữ liệu chạy (mặc định cùng thư mục source).

## Ghi chú
- Đang chạy **CPU** nên mỗi lần sinh giọng mất vài chục giây → vài phút tùy độ dài.
- Clone giọng: bản này **chưa bật tự phiên âm (Whisper)** nên phải tự nhập "ref text"
  (đúng lời trong file audio mẫu).
- Muốn tiếng Việt tốt hơn nữa có thể thêm engine VieNeu-TTS ở giai đoạn sau.

## Dữ liệu
- `outputs/` — file audio đã tạo
- `prompts/` — giọng clone (dạng `.pt`)
- `refs/` — audio mẫu đã upload
- `data/voices.json`, `data/history.json` — metadata
