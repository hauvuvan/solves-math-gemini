import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// List of available models in order of preference
const AVAILABLE_MODELS = [
  'gemini-2.0-flash',   // Latest and fastest model
  'gemini-1.5-flash',   // Previous fast model
  'gemini-1.5-pro'      // More capable model
];

// Function to format the response text
function formatResponse(text: string): string {
  // Replace markdown-style headers with HTML headers
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic text
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')              // H1 headers
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')             // H2 headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')            // H3 headers
    .replace(/\n/g, '<br>');                           // Line breaks
}

export async function POST(request: Request) {
  try {
    // Check if API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      console.error('No image provided in request');
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Log image details
    console.log('Image details:', {
      type: image.type,
      size: image.size,
      name: image.name
    });

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Create a stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Process the image and stream the response
    (async () => {
      let lastError: Error | null = null;

      // Try each model until one works
      for (const modelName of AVAILABLE_MODELS) {
        try {
          console.log(`Attempting to use model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });

          const result = await model.generateContent([
            {
              inlineData: {
                data: base64Image,
                mimeType: image.type,
              },
            },
            `Hãy giải bài tập này bằng tiếng Việt. Trình bày lời giải theo các bước rõ ràng và hiển thị tất cả các phép tính.
            
            Yêu cầu:
            1. Sử dụng tiếng Việt để giải thích
            2. Trình bày từng bước giải một cách chi tiết
            3. Hiển thị đầy đủ các phép tính
            4. Sử dụng định dạng markdown cho các tiêu đề
            5. Sử dụng LaTeX cho tất cả các công thức toán học:
               - Công thức inline: sử dụng $...$
               - Công thức riêng dòng: sử dụng $$...$$
               - Ví dụ: $E = mc^2$ hoặc $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
            6. Đảm bảo các công thức toán học được viết đúng cú pháp LaTeX
            7. Nếu có ma trận, sử dụng môi trường matrix trong LaTeX
            8. Nếu có hệ phương trình, sử dụng môi trường cases trong LaTeX`,
          ]);

          console.log(`Successfully used model: ${modelName}`);
          const response = await result.response;
          const text = response.text();
          
          // Format and stream the response
          const formattedText = formatResponse(text);
          await writer.write(new TextEncoder().encode(formattedText));
          await writer.close();
          return; // Success, exit the function
        } catch (error) {
          console.error(`Error with model ${modelName}:`, error);
          lastError = error instanceof Error ? error : new Error('Unknown error');
          // Continue to next model
        }
      }

      // If we get here, all models failed
      const errorMessage = lastError?.message || 'All models failed to process the image';
      console.error('All models failed:', errorMessage);
      await writer.write(new TextEncoder().encode(`Error: ${errorMessage}. Please try again.`));
      await writer.close();
    })();

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/html',  // Changed to HTML to support formatting
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 