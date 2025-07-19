import React, { useEffect, useState } from 'react';
import cloud from 'd3-cloud';

const ModernWordCloud = ({ data }) => {
  const [words, setWords] = useState([]);

  useEffect(() => {
    // d3-cloud expects data with 'text' and 'size' properties
    const mappedWords = data.map(d => ({
      text: d.text,
      size: 10 + Math.sqrt(d.value) * 10, // Scale size for better display
    }));

    const layout = cloud()
      .size([500, 300]) // Container dimensions
      .words(mappedWords)
      .padding(5)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90))
      .font("sans-serif")
      .fontSize(d => d.size)
      .on("end", drawnWords => {
        // This is called when the layout algorithm finishes
        setWords(drawnWords);
      });

    layout.start();
  }, [data]); // Re-run if data changes

  return (
    <div style={{ width: '100%', height: '300px', position: 'relative' }}>
      <svg width="100%" height="100%">
        <g transform="translate(250,150)"> {/* Center the cloud */}
          {words.map((word, i) => (
            <text
              key={word.text + i}
              textAnchor="middle"
              transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
              style={{ fontSize: word.size, fontFamily: 'sans-serif' }}
              fill={`hsl(${Math.random() * 360}, 70%, 50%)`}
            >
              {word.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default ModernWordCloud;