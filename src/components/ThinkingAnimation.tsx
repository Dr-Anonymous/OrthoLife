const ThinkingAnimation = () => {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="dot-loader">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
      <style>{`
        .dot-loader {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #3b82f6;
          margin: 0 4px;
          animation: dot-bounce 1.4s infinite ease-in-out both;
        }
        .dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        .dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        @keyframes dot-bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ThinkingAnimation;
