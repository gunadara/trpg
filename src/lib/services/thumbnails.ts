// src/lib/services/thumbnails.ts

/**
 * 브라우저에서 File 객체를 base64 DataURL 문자열로 변환
 * (지금은 localStorage/웹용, 나중에 SQLite/파일 시스템으로 갈아끼울 때 이 함수만 바꿔도 됨)
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('파일 읽기 실패'));
    };

    reader.readAsDataURL(file);
  });
}
