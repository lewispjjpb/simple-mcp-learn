import { z } from "zod";
import { makeNWSRequest, formatAlert } from "../services/external-api-calls";
import { NWS_API_BASE } from "../utils/app-constants";
import { AlertsResponse, ForecastPeriod, ForecastResponse, PointsResponse } from "../types/weather-types";
import { RegisteredTool, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

interface AppMcpTool {
  name: string;
  config: RegisteredTool;
  callBack: ToolCallback;
}

export const alertTool:AppMcpTool = {
  name: "get_alerts",
  config: {
    title: "Get Weather Alerts Title",
    description: "Get weather alerts for a state",
    inputSchema: {
      //@ts-ignore //TODO: fix this
      state: z
        .string()
        .length(2)
        .describe("Two-letter state code (e.g. CA, NY)"),
    },
  },
  callBack: async ({state}:any) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

    if (!alertsData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve alerts data",
          },
        ],
      };
    }

    const features = alertsData.features || [];
    if (!features.length) {
      return {
        content: [
          {
            type: "text",
            text: `No active alerts for ${stateCode}`,
          },
        ],
      };
    }

    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: alertsText,
        },
      ],
    };
  },
};

export const forecastTool:AppMcpTool = {
  name: "get_forecast",
  config: {
  description: "Get weather forecast for a location",
    inputSchema
:
  {
    //@ts-ignore
    latitude: z
      .number()
      .min(-90)
      .max(90)
      .describe("Latitude of the location"),
      longitude
  :
    z
      .number()
      .min(-180)
      .max(180)
      .describe("Longitude of the location"),
  }
,
},
callBack: async ({latitude, longitude}:any) => {
  // Get grid point data
  const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

  if (!pointsData) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
        },
      ],
    };
  }

  const forecastUrl = pointsData.properties?.forecast;
  if (!forecastUrl) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to get forecast URL from grid point data",
        },
      ],
    };
  }

  // Get forecast data
  const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
  if (!forecastData) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to retrieve forecast data",
        },
      ],
    };
  }

  const periods = forecastData.properties?.periods || [];
  if (periods.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No forecast periods available",
        },
      ],
    };
  }

  // Format forecast periods
  const formattedForecast = periods.map((period: ForecastPeriod) =>
    [
      `${period.name || "Unknown"}:`,
      `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
      `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
      `${period.shortForecast || "No forecast available"}`,
      "---",
    ].join("\n"),
  );

  const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

  return {
    content: [
      {
        type: "text",
        text: forecastText,
      },
    ],
  };
},
};