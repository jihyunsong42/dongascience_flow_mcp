#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { FlowApiClient } from "./flowApi.js";
import { FlowCredentials } from "./types.js";

// 환경변수에서 인증 정보 로드
function loadCredentials(): FlowCredentials {
  const accessToken = process.env.FLOW_ACCESS_TOKEN;
  const userId = process.env.FLOW_USER_ID;
  const useInttId = process.env.FLOW_USE_INTT_ID;

  if (!accessToken || !userId || !useInttId) {
    throw new Error(
      "Missing required environment variables: FLOW_ACCESS_TOKEN, FLOW_USER_ID, FLOW_USE_INTT_ID",
    );
  }

  return {
    accessToken,
    userId,
    useInttId,
  };
}

// 도구 입력 스키마
const GetTaskByNumberSchema = z.object({
  taskNumber: z.string().describe("조회할 업무 번호 (예: 8449)"),
});

const DownloadAttachmentSchema = z.object({
  url: z.string().describe("다운로드할 첨부파일 URL"),
  savePath: z.string().describe("저장할 경로 (파일명 포함)"),
});

const DownloadTaskAttachmentsSchema = z.object({
  taskNumber: z.string().describe("업무 번호"),
  saveDir: z.string().describe("저장할 디렉토리 경로"),
});

// MCP 서버 생성
const server = new Server(
  {
    name: "dongascience-flow-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

let flowClient: FlowApiClient | null = null;

// 도구 목록 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_task_by_number",
        description:
          "Flow 메신저에서 업무번호로 업무 상세 정보를 조회합니다. 업무명, 상태, 담당자, 내용, 첨부파일, 댓글 등의 정보를 반환합니다.",
        inputSchema: {
          type: "object",
          properties: {
            taskNumber: {
              type: "string",
              description: "조회할 업무 번호 (예: 8449)",
            },
          },
          required: ["taskNumber"],
        },
      },
      {
        name: "search_tasks",
        description:
          "Flow 메신저에서 업무를 검색합니다. 담당자, 상태, 마감일 등의 필터를 적용할 수 있습니다.",
        inputSchema: {
          type: "object",
          properties: {
            assignee: {
              type: "string",
              description: "담당자 이메일 (선택)",
            },
            status: {
              type: "string",
              enum: ["요청", "진행", "완료", "보류", "피드백"],
              description: "업무 상태 (선택)",
            },
            keyword: {
              type: "string",
              description: "검색 키워드 (선택)",
            },
          },
          required: [],
        },
      },
      {
        name: "download_attachment",
        description:
          "Flow 첨부파일 URL에서 파일을 다운로드하여 지정된 경로에 저장합니다.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "다운로드할 첨부파일 URL",
            },
            savePath: {
              type: "string",
              description:
                "저장할 경로 (파일명 포함, 예: C:/Downloads/image.png)",
            },
          },
          required: ["url", "savePath"],
        },
      },
      {
        name: "download_task_attachments",
        description:
          "업무번호로 해당 업무의 모든 첨부파일(본문 + 댓글)을 다운로드합니다.",
        inputSchema: {
          type: "object",
          properties: {
            taskNumber: {
              type: "string",
              description: "업무 번호 (예: 8449)",
            },
            saveDir: {
              type: "string",
              description: "저장할 디렉토리 경로 (예: C:/Downloads/task_8449)",
            },
          },
          required: ["taskNumber", "saveDir"],
        },
      },
      {
        name: "view_task_images",
        description:
          "업무번호로 해당 업무의 첨부 이미지들을 조회하여 화면에 표시합니다.",
        inputSchema: {
          type: "object",
          properties: {
            taskNumber: {
              type: "string",
              description: "업무 번호 (예: 8449)",
            },
          },
          required: ["taskNumber"],
        },
      },
    ],
  };
});

// 도구 실행 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // 클라이언트 초기화 (지연 초기화)
  if (!flowClient) {
    try {
      const credentials = loadCredentials();
      flowClient = new FlowApiClient(credentials);
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to initialize Flow client: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  switch (name) {
    case "get_task_by_number": {
      const parsed = GetTaskByNumberSchema.safeParse(args);
      if (!parsed.success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${parsed.error.message}`,
        );
      }

      const { taskNumber } = parsed.data;

      try {
        const task = await flowClient.getTaskByNumber(taskNumber);

        if (!task) {
          return {
            content: [
              {
                type: "text",
                text: `업무번호 ${taskNumber}에 해당하는 업무를 찾을 수 없습니다.`,
              },
            ],
          };
        }

        // 결과를 보기 좋게 포맷팅
        const formattedResult = formatTaskInfo(task);

        return {
          content: [
            {
              type: "text",
              text: formattedResult,
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to get task: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    case "search_tasks": {
      const statusMap: Record<string, string> = {
        요청: "0",
        진행: "1",
        완료: "2",
        보류: "3",
        피드백: "4",
      };

      try {
        const status = args?.status
          ? [statusMap[args.status as string] || ""]
          : undefined;
        const assignee = args?.assignee as string | undefined;

        const result = await flowClient.getTaskList({
          status: status?.filter((s) => s !== ""),
          assignee,
        });

        if (result.tasks.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "조건에 맞는 업무가 없습니다.",
              },
            ],
          };
        }

        // 업무 목록 포맷팅
        const lines: string[] = [];
        lines.push(
          `# 업무 목록 (총 ${result.total}개 중 ${result.tasks.length}개 표시)`,
        );
        lines.push("");

        result.tasks.forEach((task, i) => {
          lines.push(`## ${i + 1}. [#${task.taskNumber}] ${task.taskName}`);
          lines.push(`   - 상태: ${task.statusText}`);
          lines.push(`   - 마감일: ${task.endDate || "없음"}`);
          lines.push(`   - 프로젝트: ${task.projectName}`);
          if (task.workers.length > 0) {
            lines.push(`   - 담당자: ${task.workers.join(", ")}`);
          }
          lines.push("");
        });

        if (result.hasMore) {
          lines.push("---");
          lines.push("(더 많은 업무가 있습니다)");
        }

        return {
          content: [
            {
              type: "text",
              text: lines.join("\n"),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to search tasks: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    case "download_attachment": {
      const parsed = DownloadAttachmentSchema.safeParse(args);
      if (!parsed.success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${parsed.error.message}`,
        );
      }

      const { url, savePath } = parsed.data;

      try {
        const result = await downloadFile(url, savePath);
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to download: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    case "download_task_attachments": {
      const parsed = DownloadTaskAttachmentsSchema.safeParse(args);
      if (!parsed.success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${parsed.error.message}`,
        );
      }

      const { taskNumber, saveDir } = parsed.data;

      try {
        const task = await flowClient.getTaskByNumber(taskNumber);

        if (!task) {
          return {
            content: [
              {
                type: "text",
                text: `업무번호 ${taskNumber}에 해당하는 업무를 찾을 수 없습니다.`,
              },
            ],
          };
        }

        // 디렉토리 생성
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true });
        }

        const results: string[] = [];
        let fileIndex = 1;

        // 본문 첨부파일 다운로드
        for (const att of task.attachments) {
          const fileName = `${fileIndex}_${att.fileName}`;
          const filePath = path.join(saveDir, fileName);
          const result = await downloadFile(att.url, filePath);
          results.push(`[본문] ${result}`);
          fileIndex++;
        }

        // 댓글 첨부파일 다운로드
        for (let i = 0; i < task.comments.length; i++) {
          const comment = task.comments[i];
          for (const att of comment.attachments) {
            const fileName = `${fileIndex}_comment${i + 1}_${att.fileName}`;
            const filePath = path.join(saveDir, fileName);
            const result = await downloadFile(att.url, filePath);
            results.push(`[댓글${i + 1}] ${result}`);
            fileIndex++;
          }
        }

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `업무 #${taskNumber}에 첨부파일이 없습니다.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `업무 #${taskNumber} 첨부파일 다운로드 완료 (${results.length}개)\n저장 위치: ${saveDir}\n\n${results.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to download attachments: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    case "view_task_images": {
      const parsed = GetTaskByNumberSchema.safeParse(args);
      if (!parsed.success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${parsed.error.message}`,
        );
      }

      const { taskNumber } = parsed.data;

      try {
        const task = await flowClient.getTaskByNumber(taskNumber);

        if (!task) {
          return {
            content: [
              {
                type: "text",
                text: `업무번호 ${taskNumber}에 해당하는 업무를 찾을 수 없습니다.`,
              },
            ],
          };
        }

        // 모든 이미지 URL 수집
        const imageUrls: { url: string; label: string }[] = [];

        // 본문 첨부파일
        task.attachments.forEach((att, i) => {
          if (isImageFile(att.fileName)) {
            imageUrls.push({
              url: att.url,
              label: `본문 이미지 ${i + 1}: ${att.fileName}`,
            });
          }
        });

        // 댓글 첨부파일
        task.comments.forEach((comment, ci) => {
          comment.attachments.forEach((att, ai) => {
            if (isImageFile(att.fileName)) {
              imageUrls.push({
                url: att.url,
                label: `댓글${ci + 1} 이미지 ${ai + 1}: ${att.fileName}`,
              });
            }
          });
        });

        if (imageUrls.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `업무 #${taskNumber}에 이미지 첨부파일이 없습니다.`,
              },
            ],
          };
        }

        // 이미지들을 base64로 변환하여 응답
        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: string }
        > = [];

        content.push({
          type: "text",
          text: `# 업무 #${taskNumber} 첨부 이미지 (${imageUrls.length}개)\n\n${task.taskName}`,
        });

        for (const img of imageUrls) {
          try {
            const response = await fetch(img.url);
            if (!response.ok) continue;

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString("base64");
            const mimeType = getMimeType(img.label);

            content.push({
              type: "text",
              text: `\n### ${img.label}`,
            });

            content.push({
              type: "image",
              data: base64,
              mimeType,
            });
          } catch {
            content.push({
              type: "text",
              text: `\n### ${img.label}\n(이미지 로드 실패)`,
            });
          }
        }

        return { content };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to view images: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

// 이미지 파일 여부 확인
function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext);
}

// MIME 타입 추출
function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
  };
  return mimeTypes[ext] || "image/png";
}

// 파일 다운로드 함수
async function downloadFile(url: string, savePath: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 디렉토리가 없으면 생성
  const dir = path.dirname(savePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(savePath, buffer);

  const fileSizeKB = (buffer.length / 1024).toFixed(1);
  return `${path.basename(savePath)} (${fileSizeKB} KB) -> ${savePath}`;
}

// 업무 정보 포맷팅
function formatTaskInfo(task: {
  taskNumber: string;
  taskName: string;
  status: string;
  statusText: string;
  priority: string;
  progress: string;
  startDate: string;
  endDate: string;
  workers: { id: string; name: string; profileImage: string }[];
  author: { id: string; name: string; department: string; position: string };
  projectName: string;
  projectId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  attachments: {
    fileName: string;
    fileSize: string;
    url: string;
    thumbnailUrl: string;
  }[];
  comments: {
    author: string;
    content: string;
    createdAt: string;
    attachments: { fileName: string; url: string }[];
  }[];
  connectUrl: string;
}): string {
  const lines: string[] = [];

  lines.push(`# 업무 #${task.taskNumber}: ${task.taskName}`);
  lines.push("");
  lines.push("## 기본 정보");
  lines.push(`- **프로젝트**: ${task.projectName}`);
  lines.push(`- **상태**: ${task.statusText}`);
  lines.push(`- **우선순위**: ${task.priority}`);
  lines.push(`- **진행률**: ${task.progress}`);
  if (task.startDate) lines.push(`- **시작일**: ${task.startDate}`);
  if (task.endDate) lines.push(`- **마감일**: ${task.endDate}`);
  lines.push(`- **등록일**: ${task.createdAt}`);
  if (task.updatedAt) lines.push(`- **수정일**: ${task.updatedAt}`);
  lines.push("");

  lines.push("## 담당자");
  if (task.workers.length > 0) {
    task.workers.forEach((w) => {
      lines.push(`- ${w.name} (${w.id})`);
    });
  } else {
    lines.push("- 담당자 없음");
  }
  lines.push("");

  lines.push("## 작성자");
  lines.push(
    `- ${task.author.name} (${task.author.id}) - ${task.author.department} ${task.author.position}`,
  );
  lines.push("");

  lines.push("## 내용");
  lines.push(task.content || "(내용 없음)");
  lines.push("");

  if (task.attachments.length > 0) {
    lines.push("## 첨부파일");
    task.attachments.forEach((att) => {
      lines.push(
        `- [${att.fileName}](${att.url}) (${formatFileSize(att.fileSize)})`,
      );
    });
    lines.push("");
  }

  if (task.comments.length > 0) {
    lines.push("## 댓글");
    task.comments.forEach((c, i) => {
      lines.push(`### ${i + 1}. ${c.author} (${c.createdAt})`);
      lines.push(c.content);
      if (c.attachments.length > 0) {
        lines.push("첨부:");
        c.attachments.forEach((att) => {
          lines.push(`  - [${att.fileName}](${att.url})`);
        });
      }
      lines.push("");
    });
  }

  lines.push("---");
  lines.push(`[Flow에서 보기](${task.connectUrl})`);

  return lines.join("\n");
}

// 파일 크기 포맷팅
function formatFileSize(sizeStr: string): string {
  const size = parseInt(sizeStr, 10);
  if (isNaN(size)) return sizeStr;

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Flow MCP Server started");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
