import {
  FlowCredentials,
  TaskListResponse,
  TaskDetailResponse,
  TaskRecord,
  TaskInfo,
  STATUS_MAP,
  PRIORITY_MAP,
  CommentRecord,
} from "./types.js";

const FLOW_BASE_URL = "https://flow.team";

export class FlowApiClient {
  private credentials: FlowCredentials;

  constructor(credentials: FlowCredentials) {
    this.credentials = credentials;
  }

  /**
   * URL 인코딩된 form data 생성
   */
  private buildFormData(jsonData: Record<string, unknown>): string {
    const params = new URLSearchParams();
    params.append("_JSON_", encodeURIComponent(JSON.stringify(jsonData)));
    return params.toString();
  }

  /**
   * Flow API 호출
   */
  private async callApi<T>(
    endpoint: string,
    jsonData: Record<string, unknown>,
  ): Promise<T> {
    const url = `${FLOW_BASE_URL}${endpoint}`;
    const body = this.buildFormData(jsonData);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
        Origin: FLOW_BASE_URL,
        Referer: `${FLOW_BASE_URL}/main.act`,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(
        `Flow API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as T;
    return data;
  }

  /**
   * 업무번호로 업무 목록 검색
   */
  async searchTaskByNumber(taskNumber: string): Promise<TaskRecord | null> {
    // 담당자 필터 포함하여 검색 (본인 업무에서 찾기)
    const requestData = {
      USER_ID: this.credentials.userId,
      RGSN_DTTM: this.credentials.accessToken,
      USE_INTT_ID: this.credentials.useInttId,
      packetOption: 2,
      PG_NO: 1,
      USAGE_TYPE: "ALL",
      USAGE_FEATURE: "TASK",
      USAGE_SRNO: -1,
      COLABO_SRNO: "",
      filterRootId: "taskFilterArea",
      gridRootId: "taskContainerArea",
      pageCode: "task",
      SEARCH_WORD: "",
      SORT_REC: [],
      FILTER_REC: [
        {
          FILTER_DATA: this.credentials.userId,
          USER_REC: [{ USER_ID: this.credentials.userId }],
          COLUMN_SRNO: "1", // 담당자 필터
          OPERATOR_TYPE: "EQUAL",
        },
      ],
    };

    const response = await this.callApi<TaskListResponse>(
      "/ACT_GRID_TASK_LIST_R001.jct",
      requestData,
    );

    if (response.COMMON_HEAD.ERROR) {
      throw new Error(`Flow API error: ${response.COMMON_HEAD.MESSAGE}`);
    }

    // 업무번호가 일치하는 업무 찾기
    const task = response.TASK_REC.find((t) => {
      const taskNumColumn = t.TASK_COLUMN_REC.find(
        (col) => col.DEFAULT_COLUMN_TYPE === "TASK_NUM",
      );
      return (
        taskNumColumn?.COLUMN_DATA_REC[0]?.CUSTOM_COLUMN_DATA === taskNumber
      );
    });

    return task || null;
  }

  /**
   * 업무 상세 정보 조회
   */
  async getTaskDetail(
    colaboSrno: string,
    colaboCommtSrno: string,
  ): Promise<TaskDetailResponse> {
    const requestData = {
      USER_ID: this.credentials.userId,
      RGSN_DTTM: this.credentials.accessToken,
      GUBUN: "DETAIL",
      COLABO_SRNO: colaboSrno,
      COLABO_COMMT_SRNO: colaboCommtSrno,
      COLABO_REMARK_SRNO: "-1",
      RENEWAL_YN: "Y",
      PG_NO: 1,
      PG_PER_CNT: 1,
      COPY_YN: "N",
    };

    const response = await this.callApi<TaskDetailResponse>(
      "/COLABO2_R104.jct?mode=DETAIL",
      requestData,
    );

    if (response.COMMON_HEAD.ERROR) {
      throw new Error(`Flow API error: ${response.COMMON_HEAD.MESSAGE}`);
    }

    return response;
  }

  /**
   * 업무번호로 업무 상세 정보 조회 (통합)
   */
  async getTaskByNumber(taskNumber: string): Promise<TaskInfo | null> {
    // 1. 업무번호로 업무 검색
    const task = await this.searchTaskByNumber(taskNumber);

    if (!task) {
      return null;
    }

    // 2. 상세 정보 조회
    const detail = await this.getTaskDetail(
      task.COLABO_SRNO,
      task.COLABO_COMMT_SRNO,
    );

    if (!detail.COMMT_REC || detail.COMMT_REC.length === 0) {
      return null;
    }

    // 3. 정보 정제
    return this.parseTaskInfo(task, detail.COMMT_REC[0]);
  }

  /**
   * 날짜 문자열 포맷팅
   */
  private formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length < 8) return "";

    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    if (dateStr.length >= 14) {
      const hour = dateStr.substring(8, 10);
      const minute = dateStr.substring(10, 12);
      const second = dateStr.substring(12, 14);
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }

    return `${year}-${month}-${day}`;
  }

  /**
   * 컬럼에서 데이터 추출
   */
  private getColumnData(
    columns: {
      DEFAULT_COLUMN_TYPE: string;
      COLUMN_DATA_REC: { CUSTOM_COLUMN_DATA: string | null }[];
    }[],
    columnType: string,
  ): string {
    const column = columns.find(
      (col) => col.DEFAULT_COLUMN_TYPE === columnType,
    );
    return column?.COLUMN_DATA_REC[0]?.CUSTOM_COLUMN_DATA || "";
  }

  /**
   * JSON 컨텐츠 파싱
   */
  private parseContent(cntn: string): string {
    try {
      const parsed = JSON.parse(cntn);
      if (parsed.COMPS && Array.isArray(parsed.COMPS)) {
        return parsed.COMPS.filter(
          (comp: { COMP_TYPE: string }) => comp.COMP_TYPE === "TEXT",
        )
          .map(
            (comp: { COMP_DETAIL?: { CONTENTS?: string } }) =>
              comp.COMP_DETAIL?.CONTENTS || "",
          )
          .join("\n");
      }
      return cntn;
    } catch {
      return cntn;
    }
  }

  /**
   * 업무 정보 파싱
   */
  private parseTaskInfo(task: TaskRecord, comment: CommentRecord): TaskInfo {
    const taskDetail = comment.TASK_REC[0];
    const columns = task.TASK_COLUMN_REC;

    // 담당자 정보
    const workers =
      taskDetail?.WORKER_REC?.map((w) => ({
        id: w.WORKER_ID,
        name: w.WORKER_NM,
        profileImage: w.WORKER_PRFL_PHTG,
      })) || [];

    // 첨부파일
    const attachments =
      comment.IMG_ATCH_REC?.map((att) => ({
        fileName: att.ORCP_FILE_NM,
        fileSize: att.FILE_SIZE,
        url: att.ATCH_URL,
        thumbnailUrl: att.THUM_IMG_PATH,
      })) || [];

    // 댓글
    const comments =
      comment.REMARK_REC?.filter((r) => r.DELETE_YN !== "Y").map((r) => ({
        author: r.RGSR_NM,
        content: r.REMARK_CNTN,
        createdAt: this.formatDate(r.RGSN_DTTM),
        attachments:
          r.REMARK_IMG_ATCH_REC?.map((att) => ({
            fileName: att.ORCP_FILE_NM,
            url: att.ATCH_URL,
          })) || [],
      })) || [];

    const status = taskDetail?.STTS || this.getColumnData(columns, "STTS");

    return {
      taskNumber:
        taskDetail?.TASK_NUM || this.getColumnData(columns, "TASK_NUM"),
      taskName: taskDetail?.TASK_NM || comment.COMMT_TTL,
      status,
      statusText: STATUS_MAP[status] || "알 수 없음",
      priority: PRIORITY_MAP[taskDetail?.PRIORITY || ""] || "없음",
      progress: `${taskDetail?.PROGRESS || "0"}%`,
      startDate: this.formatDate(taskDetail?.START_DT || ""),
      endDate: this.formatDate(taskDetail?.END_DT || ""),
      workers,
      author: {
        id: comment.RGSR_ID,
        name: comment.RGSR_NM,
        department: comment.RGSR_DVSN_NM,
        position: comment.RGSR_JBCL_NM,
      },
      projectName: comment.COLABO_TTL,
      projectId: comment.COLABO_SRNO,
      content: this.parseContent(comment.CNTN) || comment.OUT_CNTN,
      createdAt: this.formatDate(comment.COMMT_RGSN_DTTM),
      updatedAt: this.formatDate(this.getColumnData(columns, "EDTR_DTTM")),
      attachments,
      comments,
      connectUrl: comment.CONNECT_URL,
    };
  }
}
