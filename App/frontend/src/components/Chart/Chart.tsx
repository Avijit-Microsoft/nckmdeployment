import { useEffect, useLayoutEffect, useState } from "react";
import {
  fetchChartData,
  fetchChartDataWithFilters,
  fetchFilterData,
} from "../../api/api";

import DonutChart from "../../chartComponents/DonutChart";
import BarChart from "../../chartComponents/HorizontalBarChart";
import WordCloudChart from "../../chartComponents/WordCloudChart";
import TopicTable from "../../chartComponents/TopicTable";
import Card from "../../chartComponents/Card";
import ChartFilter from "../ChartFilter/ChartFilter";

import "./Chart.css";
import {
  type ChartConfigItem,
  SelectedFilters,
  type FilterMetaData,
} from "../../types/AppTypes";
import { useAppContext } from "../../state/useAppContext";
import { actionConstants } from "../../state/ActionConstants";
import { ACCEPT_FILTERS, getGridStyles } from "../../configs/Utils";

type ChartProps = {
  layoutWidthUpdated: boolean;
};

const Chart = (props: ChartProps) => {
  const { state, dispatch } = useAppContext();
  const { charts } = state.dashboards;
  const { config: chartConfig } = state;
  const { layoutWidthUpdated } = props;

  const [fetchingFilters, setFetchingFilters] = useState<boolean>(false);
  const [fetchingCharts, setFetchingCharts] = useState<boolean>(false);
  console.log(">>> state", state);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [widgetsGapInPercentage, setWidgetsGapInPercentage] =
    useState<number>(1);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const handleResize = () => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 10);
    });
  }, [layoutWidthUpdated]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const getChartData = async (reqBody: any) => {
    setFetchingCharts(true);
    try {
      let chartData: any;
      if (reqBody) {
        chartData = await fetchChartDataWithFilters(reqBody);
      } else {
        chartData = await fetchChartData();
      }
      // Update charts with data
      const updatedCharts: ChartConfigItem[] = chartConfig.charts
        .map((configChart: any) => {
          if (!configChart || !configChart.id) {
            console.warn(
              "Config chart or config chart name is undefined:",
              configChart
            );
            return null; // Skip this chart if the name is missing
          }

          const apiData = chartData.find(
            (apiChart: any) =>
              apiChart.id?.toLowerCase() === configChart?.id?.toLowerCase()
          );
          const configObj = {
            id: configChart?.id,
            type: configChart?.type,
            title: apiData ? apiData?.chart_name : configChart.name || "",
            data: apiData ? apiData?.chart_value : [],
            layout: {
              row: configChart?.layout?.row,
              col: configChart?.layout?.column,
              ...configChart?.layout,
            },
          } as ChartConfigItem;
          if (configChart?.layout?.width) {
            configObj.layout.width = configChart?.layout?.width;
          }
          return configObj;
        })
        .filter((chart): chart is ChartConfigItem => chart !== null);
      dispatch({
        type: actionConstants.UPDATE_CHARTS_DATA,
        payload: updatedCharts,
      });
      setFetchingCharts(false);
    } catch (e) {
      setFetchingCharts(false);
      console.log("Error while fetching charts data", e);
    }
  };

  // Fetch chart data and filters
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!state.dashboards.filtersMetaFetched) {
          setFetchingFilters(true);
          const filterResponse = await fetchFilterData();
          const acceptedFilters: FilterMetaData = {};
          filterResponse?.forEach((obj: any) => {
            if (ACCEPT_FILTERS.includes(obj?.filter_name)) {
              const { filter_name, filter_values } = obj;
              acceptedFilters[filter_name] = filter_values;
            }
          });
          dispatch({
            type: actionConstants.SET_FILTERS,
            payload: acceptedFilters,
          });
          dispatch({
            type: actionConstants.UPDATE_FILTERS_FETCHED_FLAG,
            payload: true,
          });
          setFetchingFilters(false);
        }
        if (!state.dashboards.initialChartsDataFetched) {
          await getChartData(undefined);
          dispatch({
            type: actionConstants.UPDATE_INITIAL_CHARTS_FETCHED_FLAG,
            payload: true,
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
        dispatch({ type: actionConstants.UPDATE_CHARTS_DATA, payload: [] });
        setFetchingFilters(false);
      }
    };
    if(state.config.charts.length > 0){
      loadData();
    }
  }, [state.config.charts]);

  const applyFilters = async (updatedFilters: SelectedFilters) => {
    await getChartData(updatedFilters);
  };

  const renderChart = (chart: ChartConfigItem, heightInPixes: number) => {
    const getColorForLabel = (label: string): string => {
      switch (label) {
        case "positive":
          return "#6576F9"; // Blue
        case "neutral":
          return "#B2BBFC"; // Light Blue
        case "negative":
          return "#FF749B"; // Red
        default:
          return "#ccc"; // Default color
      }
    };
    switch (chart.type) {
      case "card":
        return (
          <Card
            value={chart.data?.[0]?.value || "0"}
            description={chart.data?.[0]?.name || ""}
            unit_of_measurement={chart.data?.[0]?.unit_of_measurement || ""}
            containerHeight={heightInPixes}
          />
        );
      case "donutchart":
        return (
          <DonutChart
            title={chart.title}
            data={chart.data.map((item) => ({
              label: item.name,
              value: parseInt(item.value) || 0,
              color: getColorForLabel(item.name),
            }))}
            containerHeight={heightInPixes}
            widthInPixels={document?.getElementById(chart?.id)!?.clientWidth}
            containerID={chart?.id}
          />
        );
      case "bar":
        return (
          <BarChart
            title={chart.title}
            data={chart.data.map((item) => ({
              category: item.name,
              value: parseFloat(item.value),
            }))}
            containerHeight={heightInPixes}
            containerID={chart?.id}
          />
        );
      case "table":
        return (
          <TopicTable
            columns={["Topic", "Frequency", "Sentiment"]}
            columnKeys={["name", "call_frequency", "average_sentiment"]}
            rows={chart.data.map((item) => ({
              name: item.name,
              call_frequency: item.call_frequency,
              average_sentiment: item.average_sentiment,
            }))}
            containerHeight={heightInPixes}
          />
        );
      case "wordcloud":
        return (
          <WordCloudChart
            title={chart.title}
            data={{
              words: chart.data.map((item) => ({
                text: item.text,
                size: item.size,
                average_sentiment: item.average_sentiment,
              })),
            }}
            widthInPixels={document?.getElementById(chart?.id)!?.clientWidth}
            containerHeight={heightInPixes}
          />
        );
      default:
        console.warn(`Unknown chart type: ${chart.type}`);
        return null;
    }
  };

  useLayoutEffect(() => {
    const updateWidths = () => {
      const newWidths: Record<string, number> = {};
      charts.forEach((chartObj) => {
        const element = document.getElementById(chartObj?.id);
        if (element) {
          newWidths[chartObj?.id] = element.clientWidth;
        }
      });
      setWidths(newWidths);
    };
    return updateWidths();
  }, [charts, windowSize.height, windowSize.width, layoutWidthUpdated]);

  const getHeightInPixels = (vh: number) => (vh / 100) * window.innerHeight;


  const groupedByRows: any = {};
  charts.forEach((obj) => {
    const rowValue = String(obj?.layout?.row);
    if (!groupedByRows[rowValue]) {
      groupedByRows[rowValue] = [];
    }
    groupedByRows[rowValue].push(obj);
  });

  return (
    <>
      {fetchingCharts ? (
        <div>Loading Please wait...</div>
      ) : (
        <div className="all-widgets-container">
          {Object.values(groupedByRows).map((chartsList: any, index) => {
            const gridStyles = getGridStyles(
              [...chartsList],
              widgetsGapInPercentage
            );
            let heightInPixes = 240;
            if (gridStyles.gridTemplateRows) {
              if (!isNaN(parseInt(gridStyles.gridTemplateRows))) {
                const heightInVH = parseInt(gridStyles.gridTemplateRows);
                heightInPixes = getHeightInPixels(heightInVH);
              }
            }
            return (
              <div
                key={index}
                className="chart-container"
                style={{ ...gridStyles, gridGap: `${widgetsGapInPercentage}%` }}
              >
                {chartsList.map((chart: any) => (
                  <div
                    key={chart.title}
                    id={chart?.id}
                    className={`chart-item ${chart.type}Container`}
                  >
                    <div className="chart-title">{chart.title}</div>
                    {renderChart(chart, heightInPixes)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {!fetchingFilters && (
        <ChartFilter
          applyFilters={applyFilters}
          acceptFilters={ACCEPT_FILTERS}
          fetchingCharts={fetchingCharts}
        />
      )}
    </>
  );
};

export default Chart;
