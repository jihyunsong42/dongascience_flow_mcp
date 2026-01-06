// Flow API 관련 타입 정의

export interface FlowCredentials {
  accessToken: string;
  userId: string;
  useInttId: string;
}

// 필터 조건
export interface FilterRecord {
  COLUMN_SRNO: string;
  FILTER_DATA: string;
  OPERATOR_TYPE: 'EQUAL' | 'CONTAIN' | 'BETWEEN' | 'CATEGORY';
  USER_REC?: { USER_ID: string }[];
}

// 정렬 조건
export interface SortRecord {
  COLUMN_SRNO: string;
  SORT_TYPE: 'ASC' | 'DESC';
}

// 업무 목록 조회 요청
export interface TaskListRequest {
  USER_ID: string;
  RGSN_DTTM: string;
  USE_INTT_ID: string;
  packetOption: number;
  PG_NO: number;
  USAGE_TYPE: string;
  USAGE_FEATURE: string;
  USAGE_SRNO: number;
  COLABO_SRNO: string;
  filterRootId: string;
  gridRootId: string;
  pageCode: string;
  SEARCH_WORD: string;
  SORT_REC: SortRecord[];
  FILTER_REC: FilterRecord[];
}

// 업무 상세 조회 요청
export interface TaskDetailRequest {
  USER_ID: string;
  RGSN_DTTM: string;
  GUBUN: string;
  COLABO_SRNO: string;
  COLABO_COMMT_SRNO: string;
  COLABO_REMARK_SRNO: string;
  RENEWAL_YN: string;
  PG_NO: number;
  PG_PER_CNT: number;
  COPY_YN: string;
}

// 컬럼 데이터
export interface ColumnDataRecord {
  OPTION_COLOR: string | null;
  OPTION_NAME: string | null;
  CUSTOM_COLUMN_DATA_SRNO: string | null;
  OPTION_CATEGORY: string | null;
  USER_NM: string | null;
  PRFL_PHTG: string | null;
  CUSTOM_COLUMN_DATA: string | null;
  COLUMN_TYPE: string | null;
}

// 업무 컬럼
export interface TaskColumnRecord {
  COLUMN_TYPE: string;
  DEFAULT_COLUMN_TYPE: string;
  COLUMN_SRNO: string;
  COLUMN_DATA_REC: ColumnDataRecord[];
}

// 담당자 정보
export interface WorkerRecord {
  WORKER_ID: string;
  WORKER_PRFL_PHTG: string;
  WORKER_NM: string;
}

// 업무 레코드 (목록)
export interface TaskRecord {
  UP_TASK_SRNO: string;
  ORDER_NUM: string;
  MNGR_DSNC: string;
  HAS_FILTERED_SUBTASK_YN: string | null;
  COLABO_COMMT_SRNO: string;
  EDIT_AUTH_TYPE: string;
  SUB_TASK_CNT: string;
  COLABO_TTL: string;
  TASK_COLUMN_REC: TaskColumnRecord[];
  UP_TASK_NM: string;
  TASK_SRNO: string;
  CNTN: string;
  COLABO_SRNO: string;
  SECTION_SRNO: string;
  DIRECTLY_FILTERED_YN: string | null;
}

// 업무 목록 응답
export interface TaskListResponse {
  TASK_REC: TaskRecord[];
  COMMON_HEAD: {
    MESSAGE: string;
    CODE: string;
    ERROR: boolean;
  };
  NEXT_YN: string;
  MODE: string;
  GROUP_AGGREGATE_REC: unknown;
}

// 첨부파일 정보
export interface AttachmentRecord {
  ORCP_FILE_NM: string;
  FILE_SIZE: string;
  RGSN_DTTM: string;
  ATCH_SRNO: string;
  ATCH_URL: string;
  THUM_IMG_PATH: string;
  WIDTH: string;
  HEIGHT: string;
  RGSR_NM: string;
  USE_INTT_ID: string;
  EXPRY_YN: string;
  DOWN_YN: string;
  CLOUD_YN: string;
}

// 댓글 정보
export interface RemarkRecord {
  MNGR_DSNC: string;
  PRFL_PHTG: string;
  REMARK_ATCH_REC: AttachmentRecord[];
  REPLY_CNT: string;
  COLABO_COMMT_SRNO: string;
  REMARK_IMG_ATCH_REC: AttachmentRecord[];
  EMT_CNT: string;
  LANG: string;
  RGSR_JBCL_NM: string | null;
  RGSR_NM: string;
  SELF_YN: string;
  COLABO_SRNO: string;
  DELETE_YN: string;
  RGSN_DTTM: string;
  EMT_SELF_YN: string;
  REMARK_CNTN: string;
  MODIFY_YN: string;
  SYSTEM_REMARK_YN: string;
  PIN_YN: string;
  PHTG_USE_YN: string;
  PIN_USE_YN: string;
  SYS_CODE: string;
  RGSR_ID: string;
  CNTN: string;
  EDTR_DTTM: string;
  COLABO_REMARK_SRNO: string;
}

// 업무 상세 정보 (게시글 내)
export interface TaskDetailInComment {
  SECTION_NAME: string | null;
  STTS: string;
  JIRA_YN: string | null;
  JIRA_ISSUE_TYPE_NM: string | null;
  IS_START_ALL_DAY: string | null;
  PRIORITY: string;
  TASK_NUM: string;
  IS_END_ALL_DAY: string | null;
  START_DT: string;
  TASK_NM: string;
  CUSTOM_COLUMN_DATA_RECORD: unknown;
  SR_VAL: string | null;
  TASK_COLUMN_REC: TaskColumnRecord[];
  PROGRESS: string;
  TASK_SRNO: string;
  WORKER_REC: WorkerRecord[];
  DRAW_SUBTASK_YN: string;
  END_DT: string;
  SECTION_SRNO: string;
}

// 게시글(댓글) 레코드
export interface CommentRecord {
  ANOYMOUS_YN: string;
  COMMT_TTL: string;
  NEXT_YN: string;
  PRFL_PHTG: string;
  COLABO_COMMT_SRNO: string;
  TODO_CONV_TTL: string;
  PUBLIC_LINK_PERMISSION: string | null;
  OUT_CNTN: string;
  TODO_REC: unknown[];
  EDIT_AUTH_TYPE: string | null;
  MORE_YN: string;
  CNTN_FIRST_LINE: string;
  UP_LINK_TASK_REC: unknown[];
  RGSR_JBCL_NM: string;
  PREVIEW_VIDEO: string;
  STATUS: string;
  TODO_YN: string;
  PREVIEW_LINK: string;
  RGSR_NM: string;
  USE_INTT_ID: string;
  POST_MOD_DEL_AUTH_YN: string;
  COMMT_INOUT: string;
  VOTE_REC: unknown;
  COMMT_RGSN_DTTM: string;
  COLABO_SRNO: string;
  DELETE_YN: string;
  REMARK_PIN_REC: unknown[];
  CHECKED_YN: string;
  SUBTASK_REC: unknown[];
  HSTR_MODE_YN: string;
  ATCH_REC: unknown[];
  TODO_TTL: string;
  SUBTASK_YN: string;
  END_YN: string;
  COLABO_TTL: string;
  PIN_YN: string;
  PTL_ID: string;
  PIN_USE_YN: string;
  LIMIT_FILE_YN: string;
  TMPL_TYPE: string;
  CNTN: string;
  ITSM_REC: unknown;
  FILE_ACCESS_PERMISSION_YN: string;
  PREVIEW_GB: string;
  COLABO_GB: string;
  ACHIEVE_CNT: string;
  COMMT_CNTN: string;
  COPY_YN: string;
  EMT_CDS: unknown;
  IMG_ATCH_REC: AttachmentRecord[];
  PRJ_AUTH: string;
  MNGR_DSNC: string;
  PREVIEW_TTL: string;
  BRING_YN: string;
  LANG: string;
  AUTH_YN: string;
  ONLY_REMARK_CNT: string;
  RGSR_CORP_NM: string;
  REMARK_REC: RemarkRecord[];
  REPLY_MOD_DEL_AUTH_YN: string;
  HTML_CNTN: string;
  RGSR_DVSN_NM: string;
  RGSR_DTTM: string;
  PREVIEW_TYPE: string;
  SELF_YN: string;
  GROUP_SRNO: string | null;
  ACTIVITY_CNT: string;
  NEXT_REMARK_CNT: string | null;
  RANGE_TYPE: string;
  REMIND_DTTM: string | null;
  SECTION_CNT: string;
  FILE_DOWN_ACCESS_PERMISSION_YN: string;
  REMARK_CNT: string;
  EMT_VIEW2: string;
  MODIFY_YN: string;
  EMT_VIEW1: string;
  CNTN_JSON_YN: string;
  READ_YN: string;
  TASK_REC: TaskDetailInComment[];
  CUSTOM_COLUMN_DATA_RECORD: unknown;
  CONNECT_URL: string;
  REMINDER_REC: unknown;
  SRCH_AUTH_YN: string;
  COMMT_GB: string;
  MNGR_WR_YN: string;
  SCRN_NO: string;
  READ_USER_CNT: string;
  SCHD_REC: unknown[];
  SURVEY_PAGE_REC: unknown;
  RGSR_ID: string;
  CHNL_ID: string;
  EXPIRE_DTTM: string;
  PREVIEW_IMG: string;
  PREVIEW_CNTN: string;
  CMNM_YN: string;
}

// 업무 상세 응답
export interface TaskDetailResponse {
  LIST_REC: unknown[];
  COMMON_HEAD: {
    MESSAGE: string;
    CODE: string;
    ERROR: boolean;
  };
  PROJECT_COLUMN_REC: unknown[];
  NEXT_YN: string;
  TOT_CNT: string;
  SECTION_CNT: string;
  ECOMMERCE_FUNC_REC: unknown;
  COMMT_REC_2: unknown;
  COMMT_REC: CommentRecord[];
  SUBTASK_UPDATE_YN: string;
  END_YN: string | null;
  ECOMMERCE_LINKED_DOMAIN: string | null;
  COLABO_SRNO: string;
  EXIST_YN: string | null;
}

// 정제된 업무 정보 (MCP 응답용)
export interface TaskInfo {
  taskNumber: string;
  taskName: string;
  status: string;
  statusText: string;
  priority: string;
  progress: string;
  startDate: string;
  endDate: string;
  workers: {
    id: string;
    name: string;
    profileImage: string;
  }[];
  author: {
    id: string;
    name: string;
    department: string;
    position: string;
  };
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
    attachments: {
      fileName: string;
      url: string;
    }[];
  }[];
  connectUrl: string;
}

// 상태값 매핑
export const STATUS_MAP: Record<string, string> = {
  '0': '대기',
  '1': '완료',
  '2': '보류',
  '3': '취소',
  '4': '진행중',
};

// 우선순위 매핑
export const PRIORITY_MAP: Record<string, string> = {
  '': '없음',
  '1': '낮음',
  '2': '보통',
  '3': '높음',
  '4': '긴급',
};
