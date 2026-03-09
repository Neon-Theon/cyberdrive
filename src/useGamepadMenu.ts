import { useEffect, useRef } from 'react';

let globalLastInputTime = performance.now();
let globalLastButtonA = false;
let globalLastButtonB = false;
let globalLastButtonStart = false;

export function useGamepadMenu(options?: { onBack?: () => void, onPause?: () => void }) {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Auto-focus first button on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const focusableElements = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (focusableElements.length > 0 && !focusableElements.includes(document.activeElement as HTMLElement)) {
        focusableElements[0].focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gp = gamepads[i];
          break;
        }
      }

      if (gp) {
        const now = performance.now();
        const axesX = gp.axes[0] || 0;
        const axesY = gp.axes[1] || 0;
        const dpadUp = gp.buttons[12]?.pressed;
        const dpadDown = gp.buttons[13]?.pressed;
        const dpadLeft = gp.buttons[14]?.pressed;
        const dpadRight = gp.buttons[15]?.pressed;
        const buttonA = gp.buttons[0]?.pressed;
        const buttonB = gp.buttons[1]?.pressed;
        const buttonStart = gp.buttons[9]?.pressed;

        const buttonAJustPressed = buttonA && !globalLastButtonA;
        const buttonBJustPressed = buttonB && !globalLastButtonB;
        const buttonStartJustPressed = buttonStart && !globalLastButtonStart;

        globalLastButtonA = buttonA;
        globalLastButtonB = buttonB;
        globalLastButtonStart = buttonStart;

        if (now - globalLastInputTime > 200) { // Debounce 200ms
          let dx = 0;
          let dy = 0;

          if (axesX < -0.5 || dpadLeft) dx = -1;
          else if (axesX > 0.5 || dpadRight) dx = 1;

          if (axesY < -0.5 || dpadUp) dy = -1;
          else if (axesY > 0.5 || dpadDown) dy = 1;

          let moved = false;

          if (buttonBJustPressed || buttonStartJustPressed || buttonAJustPressed || dx !== 0 || dy !== 0) {
            const focusableElements = Array.from(
              document.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              )
            ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);

            if (focusableElements.length > 0) {
              const activeEl = document.activeElement as HTMLElement;
              const currentIndex = focusableElements.indexOf(activeEl);

              if (buttonBJustPressed && optionsRef.current?.onBack) {
                optionsRef.current.onBack();
                moved = true;
                globalLastInputTime = now + 200;
              } else if (buttonStartJustPressed && optionsRef.current?.onPause) {
                optionsRef.current.onPause();
                moved = true;
                globalLastInputTime = now + 200;
              } else if (buttonAJustPressed) {
                if (activeEl && typeof activeEl.click === 'function') {
                  activeEl.click();
                  moved = true;
                  globalLastInputTime = now + 200; // Extra debounce for clicks
                }
              } else if (dx !== 0 || dy !== 0) {
                if (currentIndex === -1) {
                  focusableElements[0].focus();
                  moved = true;
                } else {
                  const activeRect = activeEl.getBoundingClientRect();
                  const activeCenter = {
                    x: activeRect.left + activeRect.width / 2,
                    y: activeRect.top + activeRect.height / 2
                  };

                  let bestMatch: HTMLElement | null = null;
                  let bestScore = Infinity;

                  focusableElements.forEach(el => {
                    if (el === activeEl) return;
                    const rect = el.getBoundingClientRect();
                    const center = {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2
                    };

                    const diffX = center.x - activeCenter.x;
                    const diffY = center.y - activeCenter.y;

                    // Check if the element is in the direction of movement
                    const isDirectionMatch = 
                      (dx === 1 && diffX > 0 && Math.abs(diffX) >= Math.abs(diffY)) ||
                      (dx === -1 && diffX < 0 && Math.abs(diffX) >= Math.abs(diffY)) ||
                      (dy === 1 && diffY > 0 && Math.abs(diffY) >= Math.abs(diffX)) ||
                      (dy === -1 && diffY < 0 && Math.abs(diffY) >= Math.abs(diffX));

                    if (isDirectionMatch) {
                      const dist = Math.sqrt(diffX * diffX + diffY * diffY);
                      if (dist < bestScore) {
                        bestScore = dist;
                        bestMatch = el;
                      }
                    }
                  });

                  // Fallback to simple next/prev if spatial fails
                  if (!bestMatch) {
                     if (dy === 1 || dx === 1) {
                        const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
                        bestMatch = focusableElements[nextIndex];
                     } else if (dy === -1 || dx === -1) {
                        const nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
                        bestMatch = focusableElements[nextIndex];
                     }
                  }

                  if (bestMatch) {
                    bestMatch.focus();
                    moved = true;
                  }
                }
              }
            }
          }

          if (moved) {
            globalLastInputTime = now;
          }
        }
      }

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);
}
