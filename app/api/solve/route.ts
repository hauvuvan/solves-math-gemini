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
    const subject = formData.get('subject') as 'math' | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography' | 'natural_science';
    
    if (!image) {
      console.error('No image provided in request');
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Get subject-specific prompt
    const getSubjectPrompt = (subject: string) => {
      const basePrompt = `Hãy giải bài tập này bằng tiếng Việt. Trình bày lời giải theo các bước rõ ràng và hiển thị tất cả các phép tính.
      
      Yêu cầu:
      1. Sử dụng tiếng Việt để giải thích
      2. Trình bày từng bước giải một cách chi tiết
      3. Hiển thị đầy đủ các phép tính
      4. Sử dụng định dạng markdown cho các tiêu đề
      5. Sử dụng LaTeX cho tất cả các công thức:
         - Công thức inline: sử dụng $...$
         - Công thức riêng dòng: sử dụng $$...$$
         - Ví dụ: $E = mc^2$ hoặc $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
      6. Đảm bảo các công thức được viết đúng cú pháp LaTeX`;

      const subjectSpecificPrompts = {
        math: `${basePrompt}
        7. Nếu có ma trận, sử dụng môi trường matrix trong LaTeX
        8. Nếu có hệ phương trình, sử dụng môi trường cases trong LaTeX`,
        physics: `${basePrompt}
        7. Sử dụng các ký hiệu vật lý chuẩn (ví dụ: $F = ma$, $E = mc^2$)
        8. Nếu có vector, sử dụng ký hiệu vector trong LaTeX (\\vec{v})
        9. Nếu có đơn vị đo, ghi rõ đơn vị sau mỗi kết quả
        10. Nếu có đồ thị, mô tả chi tiết cách vẽ và giải thích ý nghĩa`,
        chemistry: `${basePrompt}
        7. Sử dụng ký hiệu hóa học chuẩn (ví dụ: $H_2O$, $CO_2$)
        8. Nếu có phương trình hóa học, sử dụng môi trường chemfig hoặc align
        9. Nếu có cấu trúc phân tử, mô tả chi tiết cấu trúc
        10. Nếu có phản ứng hóa học, cân bằng phương trình và giải thích từng bước`,
        biology: `Hãy giải bài tập này bằng tiếng Việt. Trình bày lời giải theo các bước rõ ràng.
        
        Yêu cầu:
        1. Sử dụng tiếng Việt để giải thích
        2. Trình bày từng bước giải một cách chi tiết
        3. Sử dụng định dạng markdown cho các tiêu đề
        4. Nếu có thuật ngữ sinh học, giải thích rõ ràng
        5. Nếu có quá trình sinh học, mô tả chi tiết từng giai đoạn
        6. Nếu có cấu trúc sinh học, mô tả chi tiết cấu trúc và chức năng
        7. Nếu có sơ đồ, giải thích ý nghĩa của từng phần
        8. Nếu có bảng số liệu, phân tích và giải thích kết quả`,
        history: `Hãy giải bài tập này bằng tiếng Việt. Trình bày lời giải theo các bước rõ ràng.
        
        Yêu cầu:
        1. Sử dụng tiếng Việt để giải thích
        2. Trình bày từng bước giải một cách chi tiết
        3. Sử dụng định dạng markdown cho các tiêu đề
        4. Nếu có sự kiện lịch sử, nêu rõ thời gian và địa điểm
        5. Nếu có nhân vật lịch sử, nêu rõ vai trò và đóng góp
        6. Nếu có nguyên nhân - kết quả, phân tích mối quan hệ
        7. Nếu có bản đồ, giải thích ý nghĩa lịch sử
        8. Nếu có tài liệu lịch sử, phân tích nội dung và giá trị`,
        geography: `Hãy giải bài tập này bằng tiếng Việt. Trình bày lời giải theo các bước rõ ràng.
        
        Yêu cầu:
        1. Sử dụng tiếng Việt để giải thích
        2. Trình bày từng bước giải một cách chi tiết
        3. Sử dụng định dạng markdown cho các tiêu đề
        4. Nếu có vị trí địa lý, nêu rõ tọa độ và ranh giới
        5. Nếu có đặc điểm tự nhiên, mô tả chi tiết
        6. Nếu có bản đồ, giải thích các yếu tố địa lý
        7. Nếu có biểu đồ, phân tích và giải thích số liệu
        8. Nếu có mối quan hệ địa lý, phân tích tác động qua lại`,
        natural_science: `Hãy giải bài tập này bằng tiếng Việt. Trình bày lời giải theo các bước rõ ràng.
        
        Yêu cầu:
        1. Sử dụng tiếng Việt để giải thích
        2. Trình bày từng bước giải một cách chi tiết
        3. Sử dụng định dạng markdown cho các tiêu đề
        4. Phân tích và xác định các kiến thức liên quan từ:
           - Vật lý: các định luật, nguyên lý, công thức
           - Hóa học: phản ứng, cấu trúc, tính chất
           - Sinh học: quá trình, cấu trúc, chức năng
        5. Nếu có công thức, sử dụng LaTeX:
           - Công thức inline: $...$
           - Công thức riêng dòng: $$...$$
        6. Nếu có sơ đồ hoặc biểu đồ, giải thích ý nghĩa
        7. Nếu có bảng số liệu, phân tích và giải thích
        8. Nếu có thí nghiệm, mô tả quy trình và kết quả
        9. Nếu có hiện tượng tự nhiên, giải thích nguyên nhân và cơ chế
        10. Nếu có ứng dụng thực tế, liên hệ với đời sống`
      };

      return subjectSpecificPrompts[subject as keyof typeof subjectSpecificPrompts] || basePrompt;
    };

    // Log image details
    console.log('Image details:', {
      type: image.type,
      size: image.size,
      name: image.name,
      subject
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
            getSubjectPrompt(subject)
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