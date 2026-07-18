# CA Apartments

San Mateo–Hillsdale–Foster City의 아파트 후보를 지도와 Top 5 목록으로 비교하는 가족용 정적 사이트입니다. 후보 정보는 저장소의 YAML로 관리하고, 사진 원본과 영상은 Dropbox에 둡니다. 사이트에는 개인정보가 제거된 WebP 사진 미리보기만 배포합니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
```

`npm run dev`는 먼저 콘텐츠를 검증해 `src/generated/apartments.json`을 만든 다음 개발 서버를 엽니다. 주요 명령은 다음과 같습니다.

```bash
npm run validate    # YAML, 공개 필수 필드, slug/rank, 사진 쌍 검증
npm run generate    # 공개 후보 JSON 생성
npm run sync-media  # Dropbox 사진을 WebP 미리보기로 변환
npm test
npm run build
```

## 후보 추가 및 수정

후보 하나당 `content/<slug>/info.yml` 파일 하나를 둡니다. 기존 Park Place draft를 복사해 수정하면 됩니다. `slug`는 폴더명과 같아야 하고 소문자 kebab-case만 사용합니다.

```yaml
published: false
slug: example-apartments
name: Example Apartments
sourceFolder: Example Apartments
rank: 1
status: visited # considering | scheduled | visited | rejected
location:
  address: 123 Example St, San Mateo, CA 94403
  area: Hillsdale
  lat: 37.0000
  lng: -122.0000
visitDate: 2026-07-15
unit:
  number: "204"
  beds: 2
  baths: 2
  sqft: 1050
  floor: 2
  availableDate: 2026-08-01
building:
  propertyType: apartment # apartment | condo | townhouse | house | other
  yearBuilt: 1988
  totalFloors: 3
access:
  entryStairs: true
  internalStairs: false
  elevator: false
  stepFreeEntry: false
  notes: 주차장에서 현관까지 계단 한 층
lease:
  termMonths: 12
  notes: 12개월 기준 견적
parking:
  type: 지하 지정 주차
  spaces: 1
  notes: 두 번째 자리는 대기 등록 필요
costs:
  rent: 4200
  recurringFees: 85
  parking: 150
  utilitiesEstimate: 180
  deposit: 500
  promotion: 첫 달 렌트 할인
commutes:
  - label: 회사
    minutes: 18
    mode: driving # driving | transit | walking | bicycling | other
surroundings:
  - 산책로가 바로 연결됨
  - 마트까지 차로 5분
amenities:
  - 수영장
features:
  - 거실 정남향
  - 세탁기·건조기 유닛 내부
pros:
  - 역과 가까움
cons:
  - 현관까지 계단이 있음
notes: |
  직접 방문한 뒤 자유롭게 적는 메모입니다.
  여러 줄로 작성할 수 있습니다.
scores:
  location: 9
  value: 7.5
  unit: 8
  amenities: 8
  commute: 9
  overall: 8.3
links:
  official: https://example.com/
  listing: https://example.com/listing
  dropboxFolder: https://www.dropbox.com/scl/fo/example?rlkey=example&dl=0
lastVerified: 2026-07-15
```

Draft는 빈 값을 허용하므로 정보를 모으는 동안 `published: false`로 둘 수 있습니다. 공개하려면 아래 필드를 모두 채운 뒤 `published: true`로 바꿉니다.

- `name`, `sourceFolder`, 양의 정수 `rank`, `status`
- `location.address`, `location.lat`, `location.lng`
- `costs.rent`

공개 후보끼리는 `rank`가 겹칠 수 없고 모든 후보의 `slug`는 고유해야 합니다. Top 5는 `rank`가 작은 순서대로 결정됩니다. 월 예상 총비용은 렌트, 반복 비용, 주차비, 예상 공과금의 합이며 보증금과 프로모션은 별도로 표시됩니다.

`location.lat`와 `location.lng`에는 Google Maps에서 건물 위치를 우클릭했을 때 나오는 좌표를 순서대로 입력합니다. 첫 번째 숫자가 위도(`lat`), 두 번째 숫자가 경도(`lng`)입니다.

- `unit.floor`와 `building.totalFloors`는 1 이상의 정수로 적고, 유닛 층수가 건물 전체 층수보다 클 수 없습니다.
- `building.yearBuilt`는 1800년부터 실행 시점의 다음 해 사이의 연도로 적습니다.
- `building.propertyType`은 `apartment`, `condo`, `townhouse`, `house`, `other` 중 하나입니다.
- `access`의 계단·엘리베이터·무단차 진입 여부는 YAML 불리언인 `true` 또는 `false`로 적습니다.
- `surroundings`에는 동네와 생활권, `features`에는 유닛이나 건물의 특징을 목록으로 적습니다.
- 가격 필드에는 `$`나 쉼표 없이 숫자만 입력합니다.

`lease`에는 계약 기간과 계약 메모를, `parking`에는 주차 형태·가능 대수·주차 메모를 적습니다. 매월 내는 주차 요금은 별도의 `costs.parking`에 숫자로 입력합니다. 실제 정보나 좌표를 확인하기 전에는 추측해서 채우지 말고 `published: false` 상태로 두세요.

공개된 후보는 지도에 `name · #유닛번호` 라벨로 항상 표시됩니다. 같은 건물의 여러 YAML이 동일 좌표를 사용해도 화면에서만 핀을 조금씩 벌려 각각 선택할 수 있으며, YAML의 실제 좌표는 바뀌지 않습니다.

## Dropbox 사진과 영상

원본 폴더 구조는 다음과 같이 유지합니다. `sourceFolder`에는 `sourceRoot` 바로 아래 폴더 이름을 정확히 적습니다.

```text
Dropbox/CA-Apartments/
└── Example Apartments/
    ├── living-room.jpg
    ├── kitchen.heic
    └── walkthrough.mp4
```

먼저 로컬 전용 설정 파일을 만듭니다.

```bash
cp media.config.example.json media.config.local.json
```

`media.config.local.json`의 `sourceRoot`를 Dropbox `CA-Apartments` 폴더의 절대 경로로 바꾼 뒤 실행합니다.

```bash
npm run sync-media
npm run generate
```

동기화 명령은 `published: true`인 후보만 처리합니다. JPG, PNG, HEIC, TIFF, AVIF, WebP 등의 사진을 EXIF 방향에 맞게 자동 회전하고 메타데이터를 제거한 뒤 최대 폭 640px/1600px WebP 두 장으로 만듭니다. 결과는 `public/media/<slug>/`에 저장되고, 원본에서 사라진 사진의 기존 WebP도 정리됩니다. 영상과 원본 사진은 복사하거나 GitHub에 올리지 않습니다.

Dropbox에서는 아파트별 폴더에 **보기 전용 링크**를 만든 뒤 `links.dropboxFolder`에 넣으세요. 상세 화면 상단의 “사진 · 영상 전체 폴더 보기” 버튼으로 원본 사진과 영상을 확인할 수 있습니다. 링크 권한은 Dropbox에서 직접 확인해야 합니다.

## 배포와 공개 범위

`main` 브랜치에 푸시하면 GitHub Actions가 테스트와 빌드를 실행하고 GitHub Pages에 배포합니다. 저장소의 Pages 설정에서 Source가 **GitHub Actions**인지 확인하세요.

사이트에는 `noindex`가 적용되지만 이는 검색 엔진에 색인을 요청하지 않는 힌트일 뿐 접근 제어가 아닙니다. 공개 GitHub 저장소의 정보, 배포된 사진 미리보기, “링크를 아는 모든 사용자”용 Dropbox URL은 누구나 볼 수 있다고 가정하세요. 출입 코드, 전화번호, 신청서, 신분증처럼 민감한 정보는 YAML·사진·공유 폴더에 넣지 마세요.
