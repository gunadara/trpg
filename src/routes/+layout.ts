export const prerender = false;
export const ssr = false;

/* **의미:** "서버(Server) 없이 폰에서도 혼자 돌아가게 해줘!" 라는 뜻입니다.

**2. `svelte.config.js` 확인**
프로젝트 최상위 폴더에 있는 `svelte.config.js` 파일을 열어서 `adapter` 부분이 **`adapter-static`**으로 되어 있는지 확인해주세요.
(만약 `adapter-auto`로 되어 있다면, `npm i -D @sveltejs/adapter-static` 명령어로 설치하고 바꿔줘야 합니다.)

---

### 📦 2단계: 최신 상태로 포장하기

작성자님이 지금까지 만든 코드(인물, 아이템, 스킬 등)를 안드로이드 프로젝트로 옮겨 담는 과정입니다.

VS Code 터미널에 아래 명령어를 **한 줄씩** 입력하세요.

```powershell
# 1. 웹 소스 코드를 빌드합니다 (build 폴더 생성)
npm run build

# 2. 빌드된 내용을 안드로이드 프로젝트와 동기화합니다
npx cap sync
```

---

### 🤖 3단계: APK 파일 추출하기 (안드로이드 스튜디오)
npx cap sync
이제 진짜 파일을 뽑아봅시다.

1.  터미널에 다음 명령어를 입력해서 **안드로이드 스튜디오**를 엽니다.
    ```powershell
    npx cap open android
    

1. 웹 소스 최신화 & 동기화 (확실하게!)

PowerShell

npm run build
npx cap sync
2. 안드로이드 폴더로 이동

PowerShell

cd android
3. 기존 빌드 찌꺼기 청소 (Clean) 가끔 꼬인 게 있을 수 있으니 한번 싹 밀어버리는 명령어입니다.

PowerShell

.\gradlew clean
4. 새 APK 빌드 (Assemble) 이 명령어가 돌아가는 동안 시간이 좀 걸립니다(1~3분). 멈춘 게 아니니 기다려주세요.

PowerShell

.\gradlew assembleDebug

    */