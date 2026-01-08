import {
  FlowCredentials,
  TaskListResponse,
  TaskDetailResponse,
  TaskRecord,
  TaskInfo,
  STATUS_MAP,
  PRIORITY_MAP,
  CommentRecord,
  ReplyListResponse,
  RemarkRecord,
  PreviousRemarksResponse,
  PreviousRemarkRecord,
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
      PG_PER_CNT: 100,
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
   * 대댓글 조회
   */
  async getReplies(
    colaboSrno: string,
    colaboCommtSrno: string,
    colaboRemarkSrno: string,
    rgsrUseInttId: string,
  ): Promise<ReplyListResponse> {
    const requestData = {
      USER_ID: this.credentials.userId,
      RGSN_DTTM: this.credentials.accessToken,
      COLABO_SRNO: colaboSrno,
      COLABO_COMMT_SRNO: colaboCommtSrno,
      COLABO_REMARK_SRNO: colaboRemarkSrno,
      RGSR_USE_INTT_ID: rgsrUseInttId,
      packetOption: "PREVENT_EXECUTE",
    };

    const response = await this.callApi<ReplyListResponse>(
      "/ACT_FETCH_REPLY_LIST.jct",
      requestData,
    );

    if (response.COMMON_HEAD.ERROR) {
      throw new Error(`Flow API error: ${response.COMMON_HEAD.MESSAGE}`);
    }

    return response;
  }

  /**
   * 이전 댓글 조회 (페이지네이션)
   */
  async getPreviousRemarks(
    colaboSrno: string,
    colaboCommtSrno: string,
    srchColaboRemarkSrno: string,
  ): Promise<PreviousRemarksResponse> {
    const requestData = {
      USER_ID: this.credentials.userId,
      RGSN_DTTM: this.credentials.accessToken,
      MODE: "M",
      ORDER_TYPE: "P",
      COLABO_SRNO: colaboSrno,
      COLABO_COMMT_SRNO: colaboCommtSrno,
      SRCH_COLABO_REMARK_SRNO: srchColaboRemarkSrno,
      REPEAT_DTTM: "",
      REMARK_FILTER: "",
      packetOption: 1,
    };

    const response = await this.callApi<PreviousRemarksResponse>(
      "/COLABO2_REMARK_R101.jct?mode=M",
      requestData,
    );

    if (response.COMMON_HEAD.ERROR) {
      throw new Error(`Flow API error: ${response.COMMON_HEAD.MESSAGE}`);
    }

    return response;
  }

  /**
   * 업무 리스트 조회
   */
  async getTaskList(
    options: {
      status?: string[]; // 상태 필터 (0: 대기, 1: 완료, 2: 보류, 4: 진행중)
      assignee?: string; // 담당자 이메일
      projectId?: string; // 프로젝트 ID
      page?: number; // 페이지 번호
    } = {},
  ): Promise<{
    tasks: {
      taskNumber: string;
      taskName: string;
      status: string;
      statusText: string;
      endDate: string;
      projectName: string;
      projectId: string;
      workers: string[];
    }[];
    hasMore: boolean;
    total: number;
  }> {
    const filterRec: Record<string, unknown>[] = [];

    // 담당자 필터 (기본: 본인)
    const assignee = options.assignee || this.credentials.userId;
    filterRec.push({
      FILTER_DATA: assignee,
      USER_REC: [{ USER_ID: assignee }],
      COLUMN_SRNO: "1",
      OPERATOR_TYPE: "EQUAL",
    });

    // 상태 필터
    if (options.status && options.status.length > 0) {
      for (const status of options.status) {
        filterRec.push({
          COLUMN_SRNO: "9",
          FILTER_DATA: status,
          OPERATOR_TYPE: "CATEGORY",
        });
      }
    }

    const requestData = {
      USER_ID: this.credentials.userId,
      RGSN_DTTM: this.credentials.accessToken,
      USE_INTT_ID: this.credentials.useInttId,
      packetOption: 2,
      PG_NO: options.page || 1,
      USAGE_TYPE: "ALL",
      USAGE_FEATURE: "TASK",
      USAGE_SRNO: -1,
      COLABO_SRNO: options.projectId || "",
      filterRootId: "taskFilterArea",
      gridRootId: "taskContainerArea",
      pageCode: "task",
      SEARCH_WORD: "",
      SORT_REC: [],
      FILTER_REC: filterRec,
    };

    const response = await this.callApi<TaskListResponse>(
      "/ACT_GRID_TASK_LIST_R001.jct",
      requestData,
    );

    if (response.COMMON_HEAD.ERROR) {
      throw new Error(`Flow API error: ${response.COMMON_HEAD.MESSAGE}`);
    }

    const tasks = response.TASK_REC.map((t) => {
      const getCol = (type: string) => {
        const col = t.TASK_COLUMN_REC.find(
          (c) => c.DEFAULT_COLUMN_TYPE === type,
        );
        return col?.COLUMN_DATA_REC[0]?.CUSTOM_COLUMN_DATA || "";
      };

      const getWorkers = () => {
        const col = t.TASK_COLUMN_REC.find(
          (c) => c.DEFAULT_COLUMN_TYPE === "WORKER_ID",
        );
        return (
          col?.COLUMN_DATA_REC.map((r) => r.USER_NM || "").filter(Boolean) || []
        );
      };

      const status = getCol("STTS");
      const endDt = getCol("END_DT");

      return {
        taskNumber: getCol("TASK_NUM"),
        taskName: getCol("TASK_NM"),
        status,
        statusText: STATUS_MAP[status] || "알 수 없음",
        endDate: endDt ? this.formatDate(endDt) : "",
        projectName: t.COLABO_TTL,
        projectId: t.COLABO_SRNO,
        workers: getWorkers() as string[],
      };
    });

    return {
      tasks,
      hasMore: response.NEXT_YN === "Y",
      total: tasks.length,
    };
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

    const comment = detail.COMMT_REC[0];

    // 3. 이전 댓글 조회 (현재 REMARK_REC에 있는 가장 오래된 댓글 기준)
    let allRemarks: RemarkRecord[] = [...(comment.REMARK_REC || [])];

    // REMARK_CNT가 현재 가져온 댓글 수보다 많으면 이전 댓글 조회
    const totalRemarkCount = parseInt(comment.REMARK_CNT, 10) || 0;
    if (totalRemarkCount > allRemarks.length && allRemarks.length > 0) {
      try {
        // 가장 오래된 댓글의 SRNO를 기준으로 이전 댓글 조회
        const oldestRemarkSrno = allRemarks[0].COLABO_REMARK_SRNO;
        const prevResponse = await this.getPreviousRemarks(
          comment.COLABO_SRNO,
          comment.COLABO_COMMT_SRNO,
          oldestRemarkSrno,
        );

        // 이전 댓글을 RemarkRecord 형태로 변환하여 앞에 추가
        const prevRemarks: RemarkRecord[] = prevResponse.COLABO_REMARK_REC.map(
          (r) => ({
            MNGR_DSNC: r.MNGR_DSNC,
            PRFL_PHTG: r.PRFL_PHTG,
            REMARK_ATCH_REC: r.ATCH_REC,
            REPLY_CNT: r.REPLY_CNT,
            COLABO_COMMT_SRNO: r.COLABO_COMMT_SRNO,
            REMARK_IMG_ATCH_REC: r.IMG_ATCH_REC,
            EMT_CNT: r.EMT_CNT,
            LANG: r.LANG || "",
            RGSR_JBCL_NM: null,
            RGSR_NM: r.RGSR_NM,
            SELF_YN: r.SELF_YN,
            COLABO_SRNO: r.COLABO_SRNO,
            DELETE_YN: r.DELETE_YN,
            RGSN_DTTM: r.RGSN_DTTM,
            EMT_SELF_YN: r.EMT_SELF_YN,
            REMARK_CNTN: r.REMARK_CNTN,
            MODIFY_YN: r.MODIFY_YN,
            SYSTEM_REMARK_YN: r.SYSTEM_REMARK_YN,
            PIN_YN: r.PIN_YN,
            PHTG_USE_YN: r.PHTG_USE_YN,
            PIN_USE_YN: r.PIN_USE_YN,
            SYS_CODE: "",
            RGSR_ID: r.RGSR_ID,
            CNTN: r.CNTN,
            EDTR_DTTM: r.EDTR_DTTM,
            COLABO_REMARK_SRNO: r.COLABO_REMARK_SRNO,
          }),
        );

        // 이전 댓글을 앞에 추가 (시간순 정렬)
        allRemarks = [...prevRemarks, ...allRemarks];
      } catch {
        // 이전 댓글 조회 실패 시 무시
      }
    }

    // 4. 대댓글이 있는 댓글들에 대해 대댓글 조회
    const remarksWithReplies: Map<
      string,
      {
        author: string;
        content: string;
        createdAt: string;
        attachments: { fileName: string; url: string }[];
      }[]
    > = new Map();

    for (const remark of allRemarks) {
      if (parseInt(remark.REPLY_CNT, 10) > 0) {
        try {
          // RGSR_USE_INTT_ID가 없으면 credentials의 useInttId 사용
          const rgsrUseInttId =
            remark.RGSR_USE_INTT_ID || this.credentials.useInttId;
          const replyResponse = await this.getReplies(
            comment.COLABO_SRNO,
            comment.COLABO_COMMT_SRNO,
            remark.COLABO_REMARK_SRNO,
            rgsrUseInttId,
          );

          const replies = replyResponse.REPLY_REC.map((r) => ({
            author: r.RGSR_NM,
            content: r.CNTN,
            createdAt: this.formatDate(r.RGSN_DTTM),
            attachments:
              r.IMG_ATCH_REC?.map((att) => ({
                fileName: att.ORCP_FILE_NM,
                url: att.ATCH_URL,
              })) || [],
          }));

          remarksWithReplies.set(remark.COLABO_REMARK_SRNO, replies);
        } catch {
          // 대댓글 조회 실패 시 무시
        }
      }
    }

    // 5. 정보 정제 (allRemarks를 comment에 덮어씌움)
    const commentWithAllRemarks = { ...comment, REMARK_REC: allRemarks };
    return this.parseTaskInfo(task, commentWithAllRemarks, remarksWithReplies);
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
  private parseTaskInfo(
    task: TaskRecord,
    comment: CommentRecord,
    remarksWithReplies: Map<
      string,
      {
        author: string;
        content: string;
        createdAt: string;
        attachments: { fileName: string; url: string }[];
      }[]
    >,
  ): TaskInfo {
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

    // 댓글 (DELETE_YN은 실제 삭제 여부가 아닌 다른 용도로 사용되는 것으로 보임)
    const comments =
      comment.REMARK_REC?.map((r) => ({
        author: r.RGSR_NM,
        content: r.REMARK_CNTN,
        createdAt: this.formatDate(r.RGSN_DTTM),
        isSystemRemark: r.SYSTEM_REMARK_YN === "Y",
        remarkSrno: r.COLABO_REMARK_SRNO,
        replyCount: parseInt(r.REPLY_CNT, 10) || 0,
        attachments:
          r.REMARK_IMG_ATCH_REC?.map((att) => ({
            fileName: att.ORCP_FILE_NM,
            url: att.ATCH_URL,
          })) || [],
        replies: remarksWithReplies.get(r.COLABO_REMARK_SRNO) || [],
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
