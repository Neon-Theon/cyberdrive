import { useEffect, useRef } from 'react';

export function useKeyboard() {
  const keys = useRef({ forward: false, backward: false, left: false, right: false, brake: false, reset: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW': keys.current.forward = true; break;
        case 'ArrowDown':
        case 'KeyS': keys.current.backward = true; break;
        case 'ArrowLeft':
        case 'KeyA': keys.current.left = true; break;
        case 'ArrowRight':
        case 'KeyD': keys.current.right = true; break;
        case 'Space': keys.current.brake = true; break;
        case 'KeyR': keys.current.reset = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW': keys.current.forward = false; break;
        case 'ArrowDown':
        case 'KeyS': keys.current.backward = false; break;
        case 'ArrowLeft':
        case 'KeyA': keys.current.left = false; break;
        case 'ArrowRight':
        case 'KeyD': keys.current.right = false; break;
        case 'Space': keys.current.brake = false; break;
        case 'KeyR': keys.current.reset = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return keys.current;
}
