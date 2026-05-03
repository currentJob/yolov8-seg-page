import { useEffect } from "react";

export function useKeyboard(handlers) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 입력창(input, select, textarea)에서 타이핑 중일 때는 단축키를 무시
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT"
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;
      
      const handler = handlers[key] || handlers[code];
      
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
