# AI Giải Bài Tập

Ứng dụng web sử dụng Gemini API để giải bài tập từ hình ảnh.

## Tính năng

- Upload hình ảnh bài tập
- Giải bài tập tự động bằng AI
- Hiển thị lời giải chi tiết
- Hỗ trợ công thức toán học
- Giao diện thân thiện với người dùng

## Cài đặt

1. Clone repository:
```bash
git clone [URL_REPOSITORY]
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file .env.local và thêm API key:
```
GOOGLE_API_KEY=your_api_key_here
```

4. Chạy development server:
```bash
npm run dev
```

## Công nghệ sử dụng

- Next.js 14
- TypeScript
- Tailwind CSS
- Gemini API
- KaTeX (hiển thị công thức toán học)

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and paste it in your `.env.local` file

## Usage

1. Drag and drop an image of an exercise or click to select one
2. Wait for the image to upload
3. Click "Solve Exercise"
4. Watch as the AI streams the solution step by step

## Note

Make sure to keep your API key secure and never commit it to version control. 