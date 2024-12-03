import {
  historyListResponse,
  historyReadResponse,
} from "../configs/StaticData";
import {
  AppConfig,
  ChartConfigItem,
  ChatMessage,
  Conversation,
  ConversationRequest,
  CosmosDBHealth,
  CosmosDBStatus,
} from "../types/AppTypes";

export const fetchChartData = async () => {
  try {
    console.log("Fetching chart data...");
    const response = await fetch("/api/fetchChartData");
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log("data", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch chart data:", error);
    throw error; // Rethrow the error so the calling function can handle it
  }
};

export const fetchChartDataWithFilters = async (bodyData: any) => {
  try {
    const response = await fetch("/api/fetchChartDataWithFilters", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(bodyData),
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch filtered chart data:", error);
    throw error; // Rethrow the error so the calling function can handle it
  }
};

export const fetchFilterData = async () => {
  try {
    console.log("Fetching filter data...");
    const response = await fetch("/api/fetchFilterData");
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch filter data:", error);
    throw error;
  }
};

export const historyRead = async (convId: string): Promise<ChatMessage[]> => {
  const response = await fetch("/history/read", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: convId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        // return [];
        return historyReadResponse.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          date: msg.createdAt,
          feedback: msg.feedback ?? undefined,
          context: msg.context, // if available
          contentType: msg.contentType, // if available
        }));
      }
      const payload = await res.json();
      const messages: ChatMessage[] = [];

      // Ensure payload.messages is treated as an array
      if (Array.isArray(payload?.messages)) {
        payload.messages.forEach((msg: any) => {
          const message: ChatMessage = {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            date: msg.createdAt,
            feedback: msg.feedback ?? undefined,
            context: msg.context, // if available
            contentType: msg.contentType, // if available
          };
          messages.push(message);
        });
      }
      return messages;
    })
    .catch((_err) => {
      console.error("There was an issue fetching your data.");
      return [];
    });
  console.log("historyReadResponse.messages::", historyReadResponse.messages);
  return response;
};

export const historyList = async (
  offset = 0
): Promise<Conversation[] | null> => {
  let response = await fetch(`/history/list?offset=${offset}`, {
    method: "GET",
  })
    .then(async (res) => {
      let payload = await res.json();
      if (!Array.isArray(payload)) {
        console.error("There was an issue fetching your data.");
        return null;
      }
      const conversations: Conversation[] = payload.map((conv: any) => {
        const conversation: Conversation = {
          id: conv.id,
          title: conv.title,
          date: conv.createdAt,
          updatedAt: conv?.updatedAt,
          messages: [],
        };
        return conversation;
      });
      return conversations;
    })
    .catch((_err) => {
      console.error("There was an issue fetching your data.", _err);
      const conversations: Conversation[] = historyListResponse.map(
        (conv: any) => {
          const conversation: Conversation = {
            id: conv.id,
            title: conv.title,
            date: conv.createdAt,
            updatedAt: conv?.updatedAt,
            messages: [],
          };
          return conversation;
        }
      );
      return conversations;
      // return null;
    });
  return response;
};

export const historyUpdate = async (
  messages: ChatMessage[],
  convId: string
): Promise<Response> => {
  const response = await fetch("/history/update", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: convId,
      messages: messages,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(async (res) => {
      return res;
    })
    .catch((_err) => {
      console.error("There was an issue fetching your data.");
      const errRes: Response = {
        ...new Response(),
        ok: false,
        status: 500,
      };
      return errRes;
    });
  return response;
};

export async function getLayoutConfig(): Promise<{
  appConfig: AppConfig;
  charts: ChartConfigItem[];
}> {
  const response = await fetch("/api/layout-config", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  try {
    if (response.ok) {
      const layoutConfigData = await response.json();
      console.log("layoutConfigData", layoutConfigData);
      return layoutConfigData;
    }
  } catch {
    console.error("Failed to parse Layout config data");
  }
  return {
    appConfig: null,
    charts: [],
  };
}

// /api/conversation
// /api/chat
export async function callConversationApi(
  options: ConversationRequest,
  abortSignal: AbortSignal
): Promise<Response> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: options.messages,
      conversation_id: options.id,
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData.error));
  }

  return response;
}

export const historyRename = async (
  convId: string,
  title: string
): Promise<Response> => {
  const response = await fetch("/history/rename", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: convId,
      title: title,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      return res;
    })
    .catch((_err) => {
      console.error("There was an issue fetching your data.");
      const errRes: Response = {
        ...new Response(),
        ok: false,
        status: 500,
      };
      return errRes;
    });
  return response;
};

export const historyDelete = async (convId: string): Promise<Response> => {
  const response = await fetch("/history/delete", {
    method: "DELETE",
    body: JSON.stringify({
      conversation_id: convId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      return res;
    })
    .catch((_err) => {
      console.error("There was an issue fetching your data.");
      const errRes: Response = {
        ...new Response(),
        ok: false,
        status: 500,
      };
      return errRes;
    });
  return response;
};

export const historyDeleteAll = async (): Promise<Response> => {
  const response = await fetch("api/history/delete_all", {
    method: "DELETE",
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => {
      return res;
    })
    .catch((_err) => {
      console.error("There was an issue fetching your data.");
      const errRes: Response = {
        ...new Response(),
        ok: false,
        status: 500,
      };
      return errRes;
    });
  return response;
};

export const historyEnsure = async (): Promise<CosmosDBHealth> => {
  const response = await fetch("/history/ensure", {
    method: "GET",
  })
    .then(async (res) => {
      const respJson = await res.json();
      let formattedResponse;
      if (respJson.message) {
        formattedResponse = CosmosDBStatus.Working;
      } else {
        if (res.status === 500) {
          formattedResponse = CosmosDBStatus.NotWorking;
        } else if (res.status === 401) {
          formattedResponse = CosmosDBStatus.InvalidCredentials;
        } else if (res.status === 422) {
          formattedResponse = respJson.error;
        } else {
          formattedResponse = CosmosDBStatus.NotConfigured;
        }
      }
      if (!res.ok) {
        return {
          cosmosDB: false,
          status: formattedResponse,
        };
      } else {
        return {
          cosmosDB: true,
          status: formattedResponse,
        };
      }
    })
    .catch((err) => {
      console.error("There was an issue fetching your data.");
      return {
        cosmosDB: false,
        status: err,
      };
    });
  return response;
};

export const historyGenerate = async (
  options: ConversationRequest,
  abortSignal: AbortSignal,
  convId?: string
): Promise<Response> => {
  let body;
  if (convId) {
    body = JSON.stringify({
      conversation_id: convId,
      messages: options.messages,
      // client_id:options.client_id
    });
  } else {
    body = JSON.stringify({
      messages: options.messages,
      // client_id:options.client_id
    });
  }
  const response = await fetch("/history/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body,
    signal: abortSignal,
  })
    .then((res) => {
      return res;
    })
    .catch((_err) => {
      console.error("There was an issue fetching your data.");
      return new Response();
    });
  return response;
};
