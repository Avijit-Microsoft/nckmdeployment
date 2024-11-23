import React, { useEffect } from "react";
import * as d3 from "d3";
import cloud from "d3-cloud";
import { colors } from "../configs/Utils";
interface WordCloudData {
  words: {
    text: string;
    size: number;
    average_sentiment: "positive" | "negative" | "neutral";
  }[];
}

interface WordCloudChartProps {
  data: WordCloudData;
  title: string;
  containerHeight: number; // prop for dynamic height
  widthInPixels: number;
}

const WordCloudChart: React.FC<WordCloudChartProps> = ({
  data,
  title,
  containerHeight,
  widthInPixels = 300,
}) => {
  useEffect(() => {
    const HEIGHT_OFFSET = 30;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const width = widthInPixels - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom - HEIGHT_OFFSET;
    // Clear previous SVG elements
    d3.select("#wordcloud").selectAll("*").remove();

    // Prepare words data
    const words = data.words.map((d) => ({
      text: d.text,
      size: d.size,
      color: colors[d.average_sentiment],
    }));

    const layout = cloud()
      .size([width, height])
      .words(words)
      .padding(5)
      .fontSize((d) => d.size)
      .rotate(() => Math.floor(Math.random() * 2) * 0)
      .on("end", (words: any) => {
        draw(words);
      });

    layout.start();

    function draw(
      words: {
        text: string;
        size: number;
        x: number;
        y: number;
        rotate: number;
        color: string;
      }[]
    ) {
      const svg = d3
        .select("#wordcloud")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

      svg
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", (d) => `${d.size}px`)
        .style("fill", (d) => d.color || "#69b3a2")
        .attr("text-anchor", "middle")
        .attr(
          "transform",
          (d) => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`
        )
        .text((d) => d.text);
    }
  }, [data.words.length, widthInPixels]);

  return (
    <div style={WordCloudStyles.mainContainer}>
      <div id="wordcloud" />
    </div>
  );
};

export default WordCloudChart;

const WordCloudStyles = {
  mainContainer: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0px 1px 5px rgba(0, 0, 0, 0.1)",
    height: "91%",
  },
};
