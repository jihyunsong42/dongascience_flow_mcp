# Flow MCP Server

Flow 메신저에서 업무 정보를 조회하고 첨부파일을 다운로드할 수 있는 MCP 서버입니다.

## 설치

```bash
npm install
npm run build
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 정보를 입력합니다.

### 방법 1: 비밀번호 사용 (권장)

**자동 로그인 기능**을 사용하면 토큰 만료 시 자동으로 재로그인됩니다.

```
FLOW_USER_ID=your_email@example.com
FLOW_PASSWORD=your_password
```

### 방법 2: 수동 토큰 입력

토큰을 직접 입력하는 방식입니다. 토큰이 만료되면 수동으로 업데이트해야 합니다.

```
FLOW_ACCESS_TOKEN=your_token_here
FLOW_USER_ID=your_email@example.com
FLOW_USE_INTT_ID=BFLOW_xxxxxxxx
```

#### 인증 정보 얻는 방법

1. 브라우저에서 https://flow.team 접속 후 로그인
2. DevTools 열기 (F12)
3. Network 탭에서 아무 API 요청 클릭
4. Payload 탭에서 `_JSON_` 파라미터 값 복사
5. URL 디코딩 후 다음 값 추출:
   - `RGSN_DTTM` → `FLOW_ACCESS_TOKEN`
   - `USER_ID` → `FLOW_USER_ID`
   - `USE_INTT_ID` → `FLOW_USE_INTT_ID`

## Claude Desktop 설정

`%APPDATA%\Claude\claude_desktop_config.json` (Windows) 또는 `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)에 다음 내용 추가:

### 비밀번호 사용 시 (권장)

```json
{
  "mcpServers": {
    "flow": {
      "command": "node",
      "args": ["/path/to/dongascience_flow_mcp/dist/index.js"],
      "env": {
        "FLOW_USER_ID": "your_email@example.com",
        "FLOW_PASSWORD": "your_password"
      }
    }
  }
}
```

### 토큰 사용 시

```json
{
  "mcpServers": {
    "flow": {
      "command": "node",
      "args": ["/path/to/dongascience_flow_mcp/dist/index.js"],
      "env": {
        "FLOW_ACCESS_TOKEN": "your_token",
        "FLOW_USER_ID": "your_email@example.com",
        "FLOW_USE_INTT_ID": "BFLOW_xxxxxxxx"
      }
    }
  }
}
```

설정 후 Claude Desktop을 재시작합니다.

## 제공 도구

### 1. get_task_by_number

업무번호로 업무 상세 정보를 조회합니다.

**입력:**
- `taskNumber`: 조회할 업무 번호 (예: "8449")

**반환 정보:**
- 업무명, 상태, 우선순위, 진행률
- 시작일, 마감일, 등록일, 수정일
- 담당자, 작성자 정보
- 업무 내용, 첨부파일, 댓글
- Flow 링크

**사용 예시:**
```
업무번호 8449 조회해줘
```

### 2. download_attachment

단일 첨부파일을 다운로드합니다.

**입력:**
- `url`: Flow 첨부파일 URL
- `savePath`: 저장할 경로 (파일명 포함)

**사용 예시:**
```
이 URL에서 파일 다운로드해서 C:/Downloads/image.png로 저장해줘
```

### 3. download_task_attachments

업무의 모든 첨부파일(본문 + 댓글)을 일괄 다운로드합니다.

**입력:**
- `taskNumber`: 업무 번호
- `saveDir`: 저장할 디렉토리 경로

**사용 예시:**
```
업무 8449의 첨부파일 모두 C:/Downloads/task_8449에 다운로드해줘
```

### 4. view_task_images

업무의 첨부 이미지를 조회하여 Claude가 직접 볼 수 있도록 표시합니다.

**입력:**
- `taskNumber`: 업무 번호

**사용 예시:**
```
업무 8449 이미지 보여줘
```

## 개발

```bash
# 개발 모드 실행
npm run dev

# 빌드
npm run build

# 실행
npm start
```

## 주의사항

- **비밀번호 사용 시**: 토큰이 자동으로 갱신되므로 별도 관리가 필요 없습니다.
- **토큰 사용 시**: `FLOW_ACCESS_TOKEN`은 세션 기반이라 만료될 수 있습니다. 만료 시 브라우저에서 다시 캡처해야 합니다.
- 모든 업무 조회 가능 (담당자와 무관)
