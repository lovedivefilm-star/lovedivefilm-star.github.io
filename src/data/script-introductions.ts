/** Authored introductions and selected excerpts only. Complete scripts are never imported. */
export type ScriptId = 'madeinhongdae' | 'boundary' | 'butter' | 'human-birth' | 'understeer' | 'oneandonly' | 'firstimpression';

export type IntroductionLine = {
  type: 'scene' | 'action' | 'dialogue';
  text: string;
  character?: string;
  continued?: boolean;
  emphasis?: boolean;
};

export type ScriptIntroduction = {
  id: ScriptId;
  title: string;
  format: string;
  genre?: string;
  stage?: string;
  credit: string;
  introduction: string;
  sceneContext?: string;
  excerptLabel: string;
  excerpt: IntroductionLine[];
  previewExcerpt: IntroductionLine[];
  workHref?: string;
  filmLinkLabel?: string;
};

export const SCRIPT_INTRODUCTIONS: ScriptIntroduction[] = [
  {
    "id": "madeinhongdae",
    "title": "메이드 인 홍대",
    "format": "50분 / 8부작",
    "credit": "대본 김영건",
    "introduction": "힙스터처럼 특별하고 낙오자처럼 불안한 청춘들의 클럽, 술, 마약, 섹스, 인스타로 가득한 홍대 거리 생존기.",
    "excerptLabel": "EP.2 대본 발췌",
    "excerpt": [
      {
        "type": "scene",
        "text": "하남녀 하우스 - 재이의 방 / N"
      },
      {
        "type": "dialogue",
        "text": "들려줘. 다른 사람들한테도. ",
        "character": "유진"
      },
      {
        "type": "dialogue",
        "text": "(?) 나 사람 앞에서 노래 안 부른다니까...!",
        "character": "재이"
      },
      {
        "type": "action",
        "text": "유진이 노트북 가리킨다. 당황한 재이 유진이 무슨 소리 하나 싶고 -"
      },
      {
        "type": "dialogue",
        "text": "유튜브. 이건 카메라 앞에서 부르는거잖아. ",
        "character": "유진",
        "emphasis": true
      },
      {
        "type": "dialogue",
        "text": "그리고 이미 들려줄게 있던데? (미소)",
        "continued": true
      },
      {
        "type": "action",
        "text": "그때 현우에게 문자가 도착한다. ‘ㅆㅂ 유하랑 이년 개만취야. 좀 깨우고 들어갈 테니까 뜨밤^^ 괜히 돈 써서 모텔 쳐가지 말고' 재이 화들짝 놀라서 폰 끄는데."
      },
      {
        "type": "action",
        "text": "이내 갑자기 어떤 생각이 떠올랐는지, 멈칫한다. 폰과 유진을 번갈아 보고."
      },
      {
        "type": "dialogue",
        "text": "... 아이 씨...",
        "character": "재이"
      },
      {
        "type": "action",
        "text": "재이는 유진이 화면을 보지 못하게 노트북을 자신쪽으로 끌어온다. 화면 켜면  영상 보이고. 클릭하자 떨리는 손. 1절의 끝으로 간다. 더 이상 넘기지 않고 2절을 잘라낸다. 유튜브 사이트에 들어가 업로드 창에 영상을 몇 번이나 올렸다 내렸다 하는 재이. 결국 업로드 하지만, 이내 사이트 나가버리고."
      },
      {
        "type": "dialogue",
        "text": "(노트북 닫으며) 아 몰라. 생각 좀 해보고.",
        "character": "재이"
      }
    ],
    "previewExcerpt": [
      {
        "type": "scene",
        "text": "하남녀 하우스 - 재이의 방 / N"
      },
      {
        "type": "dialogue",
        "text": "들려줘. 다른 사람들한테도. ",
        "character": "유진"
      },
      {
        "type": "dialogue",
        "text": "(?) 나 사람 앞에서 노래 안 부른다니까...!",
        "character": "재이"
      },
      {
        "type": "action",
        "text": "유진이 노트북 가리킨다. 당황한 재이 유진이 무슨 소리 하나 싶고 -"
      },
      {
        "type": "dialogue",
        "text": "유튜브. 이건 카메라 앞에서 부르는거잖아. ",
        "character": "유진",
        "emphasis": true
      },
      {
        "type": "dialogue",
        "text": "그리고 이미 들려줄게 있던데? (미소)",
        "continued": true
      }
    ],
    "stage": "기획"
  },
  {
    "id": "boundary",
    "title": "경계선",
    "format": "70분 단막극",
    "credit": "대본 김영건",
    "introduction": "19년 평생을 함께해온 클래식 전공의 예고생 선아와 유현, 그들의 아버지가 의미심장한 사고에 휘말려 사건의 진실을 추적하는 과정 속에서 서로에게 주었던 상처를 마주한다.",
    "excerptLabel": "대본 발췌",
    "excerpt": [
      {
        "type": "scene",
        "text": "S#31 / 택시 / 저녁"
      },
      {
        "type": "dialogue",
        "text": "(핸드폰 화면을 보여주며) 네가 깔자고 했었잖아. ",
        "character": "유현"
      },
      {
        "type": "action",
        "text": "커플 위치 공유 앱이다. 붉은 두 점이 나란히 붙어 도로를 통과하고 있다. "
      },
      {
        "type": "dialogue",
        "text": "뭐 하나만 물어볼게. 너. 우리 아빠가 사고당한 날 어디에 있었어?",
        "character": "선아"
      },
      {
        "type": "dialogue",
        "text": "… 알고 있잖아. 그날 합주 도와주러 갔던 거.",
        "character": "유현"
      },
      {
        "type": "dialogue",
        "text": "제발. 사실을 얘기해. ",
        "character": "선아"
      },
      {
        "type": "dialogue",
        "text": "합주 도와주러 갔어.",
        "character": "유현"
      },
      {
        "type": "dialogue",
        "text": "그럼. 너랑 나밖에 없는 그 구두의 발자국이 왜 그곳에 찍혀 있는건데?",
        "character": "선아"
      },
      {
        "type": "dialogue",
        "text": "… 내 발자국 아니야. 네가 그곳에 갔잖아. 네 발자국이겠지.",
        "character": "유현"
      },
      {
        "type": "dialogue",
        "text": "내 발보다 컸어. 저 밑창 무늬를 남길 수 있는 사람은 너랑 나, 둘 밖에 없어. 도대체 뭘 숨기고 있는 거야. 아니 왜 숨겨야 하는 거야?",
        "character": "선아",
        "emphasis": true
      },
      {
        "type": "dialogue",
        "text": "… 그래. 갔어. 근데 이미 갔을 때는 사고가 난 뒤였어. ",
        "character": "유현"
      },
      {
        "type": "dialogue",
        "text": "뭐…? 왜. 왜. 갔는데? 아니. 왜 그걸 여태 숨긴 건데.",
        "character": "선아"
      }
    ],
    "previewExcerpt": [
      {
        "type": "scene",
        "text": "S#31 / 택시 / 저녁"
      },
      {
        "type": "dialogue",
        "text": "내 발보다 컸어. 저 밑창 무늬를 남길 수 있는 사람은 너랑 나, 둘 밖에 없어. 도대체 뭘 숨기고 있는 거야. 아니 왜 숨겨야 하는 거야?",
        "character": "선아",
        "emphasis": true
      },
      {
        "type": "dialogue",
        "text": "… 그래. 갔어. 근데 이미 갔을 때는 사고가 난 뒤였어. ",
        "character": "유현"
      },
      {
        "type": "dialogue",
        "text": "뭐…? 왜. 왜. 갔는데? 아니. 왜 그걸 여태 숨긴 건데.",
        "character": "선아"
      }
    ]
  },
  {
    "id": "butter",
    "title": "버터! [VirTer!]",
    "format": "단막극(70분)",
    "credit": "대본 김영건",
    "introduction": "버터(Virtual Dater – 가상현실 데이트 어플)의 1호 커플이자, 창립 멤버인 지현은 임원으로의 승진 여부가 걸린 프로젝트 완수를 위해 뛰어든 버터에서 자신의 애인인 한주와 매칭된다.",
    "excerptLabel": "대본 발췌",
    "excerpt": [
      {
        "type": "scene",
        "text": "버터 - 성당 / N"
      },
      {
        "type": "action",
        "text": "지현 창백한 얼굴로 동그라미를 그려 매칭을 포기하려는데 – 한주가 지현의 손을 잡고 막는다."
      },
      {
        "type": "dialogue",
        "text": "대답해줘. 누나. 그날 왜 못 온 거야? 죄책감 때문이었어?",
        "character": "한주"
      },
      {
        "type": "dialogue",
        "text": "뭐? 죄책감? 야 지금 무릎 꿇고 빌어야 할 건 너야. ",
        "character": "지현"
      },
      {
        "type": "dialogue",
        "text": "뭐 등잔 밑이 어둡다고 여기서 이러고 있었니?",
        "continued": true
      },
      {
        "type": "dialogue",
        "text": "안 아팠잖아 그날. 스튜디오 바로 앞까지 왔었잖아.",
        "character": "한주",
        "emphasis": true
      },
      {
        "type": "dialogue",
        "text": "지금 대체 뭔 소리야? 아니라니까!",
        "character": "지현"
      },
      {
        "type": "action",
        "text": "그 순간, 버터워치가 삐 소리 나며 녹아 흐른다. 'X.X.O' "
      },
      {
        "type": "dialogue",
        "text": "야. 너나 해명해. 여기서 뭐하고 있냐 지금? 내가 만든 곳에서 얼굴 가리고 딴 년들하고 시시덕거리고 있었니? ",
        "character": "지현"
      },
      {
        "type": "dialogue",
        "text": "너 그날은 뭐했는데. 여기서 매칭된 년하고 아침까지 같이 있었니?",
        "continued": true
      },
      {
        "type": "dialogue",
        "text": "아니. ",
        "character": "한주"
      },
      {
        "type": "dialogue",
        "text": "(한주 버터워치 보는데 멀쩡하다) 뭐?",
        "character": "지현"
      },
      {
        "type": "dialogue",
        "text": "현관 앞에서 아침까지 앉아있었어. ",
        "character": "한주"
      },
      {
        "type": "dialogue",
        "text": "멀쩡히 누나 얼굴 볼 자신이 없어서. 그날 알았거든. ",
        "continued": true
      },
      {
        "type": "dialogue",
        "text": "…?",
        "character": "지현"
      },
      {
        "type": "dialogue",
        "text": "스무스라이크버터. 기획이었잖아. 누나가 만든.",
        "character": "한주"
      }
    ],
    "previewExcerpt": [
      {
        "type": "scene",
        "text": "버터 - 성당 / N"
      },
      {
        "type": "dialogue",
        "text": "뭐? 죄책감? 야 지금 무릎 꿇고 빌어야 할 건 너야. ",
        "character": "지현"
      },
      {
        "type": "dialogue",
        "text": "뭐 등잔 밑이 어둡다고 여기서 이러고 있었니?",
        "continued": true
      },
      {
        "type": "dialogue",
        "text": "안 아팠잖아 그날. 스튜디오 바로 앞까지 왔었잖아.",
        "character": "한주",
        "emphasis": true
      },
      {
        "type": "dialogue",
        "text": "지금 대체 뭔 소리야? 아니라니까!",
        "character": "지현"
      },
      {
        "type": "action",
        "text": "그 순간, 버터워치가 삐 소리 나며 녹아 흐른다. 'X.X.O' "
      }
    ],
    "genre": "로맨스릴러 / SF",
    "workHref": "/works/butter/",
    "filmLinkLabel": "예고편 보기",
    "sceneContext": "미션 - 오직 진실만을 말하기, 세 번의 거짓을 말할 시 미션 실패로 매칭이 취소됩니다."
  },
  {
    "id": "human-birth",
    "title": "사람은 탄생하라",
    "format": "8부작",
    "credit": "대본 김영건",
    "introduction": "AI와의 내전으로 트라우마를 안고 경찰이 된 참전 군인 조이, 동료 경찰의 수상한 죽음을 추적하던 중, 사건의 중심에 위치한 3일마다 기록이 초기화되는 가사용 AI O2-11과 사랑에 빠진다.",
    "excerptLabel": "EP.2 대본 발췌",
    "excerpt": [
      {
        "type": "scene",
        "text": "조이의 집 / (N)"
      },
      {
        "type": "action",
        "text": "조이 불안한 듯 거실을 계속 맴돈다. 여전히 의식이 없고 소켓이 반짝거리는 O2-11. 조이 계속해서 전화를 걸지만, 받지 않는다. 조이 외투를 걸치려는데, 순간 오투가 눈을 뜬다. 오투에게 달려가 일으켜 세우는 조이."
      },
      {
        "type": "dialogue",
        "text": "(거칠게 숨을 내쉬며) 나 누군지 알겠어?",
        "character": "조이"
      },
      {
        "type": "dialogue",
        "text": "제 소유주이신 조이님입니다.",
        "character": "O2-11"
      },
      {
        "type": "dialogue",
        "text": "우리가 무슨 말을 하고 있었는지 … 기억나? 아토, 소켓, 납치 … 콩콩.",
        "character": "조이"
      },
      {
        "type": "dialogue",
        "text": "제 메모리에는 존재하지 않는 기록입니다. ",
        "character": "O2-11",
        "emphasis": true
      },
      {
        "type": "action",
        "text": "조이 잡고 있던 오투의 팔을 떨어트린다. 아연실색한 조이. "
      }
    ],
    "previewExcerpt": [
      {
        "type": "scene",
        "text": "조이의 집 / (N)"
      },
      {
        "type": "dialogue",
        "text": "(거칠게 숨을 내쉬며) 나 누군지 알겠어?",
        "character": "조이"
      },
      {
        "type": "dialogue",
        "text": "제 소유주이신 조이님입니다.",
        "character": "O2-11"
      },
      {
        "type": "dialogue",
        "text": "우리가 무슨 말을 하고 있었는지 … 기억나? 아토, 소켓, 납치 … 콩콩.",
        "character": "조이"
      },
      {
        "type": "dialogue",
        "text": "제 메모리에는 존재하지 않는 기록입니다. ",
        "character": "O2-11",
        "emphasis": true
      },
      {
        "type": "action",
        "text": "조이 잡고 있던 오투의 팔을 떨어트린다. 아연실색한 조이. "
      }
    ],
    "genre": "SF 스릴러 / 멜로",
    "stage": "기획"
  },
  {
    "id": "understeer",
    "title": "언더스티어",
    "format": "8부작",
    "credit": "대본 김영건",
    "introduction": "윤진은 언니의 병원비를 위해 새아빠 성민과 거래한다. 재능을 트로피가 아닌 범죄에 쓰기로.",
    "excerptLabel": "대본 발췌",
    "excerpt": [
      {
        "type": "scene",
        "text": "수정의 집 / N"
      },
      {
        "type": "action",
        "text": "윤진의 라이딩 영상을 보고 있던 성민. 방문이 열린다. 방 안으로 들어오는 윤진. 이를 악물지만 자꾸 흘러내리는 눈물. "
      },
      {
        "type": "dialogue",
        "text": "일 할래요.",
        "character": "윤진"
      },
      {
        "type": "dialogue",
        "text": "...",
        "character": "성민"
      },
      {
        "type": "dialogue",
        "text": "못 갚으면 일하라면서요. 돈 더 필요해요.",
        "character": "윤진"
      },
      {
        "type": "dialogue",
        "text": "얼마가 필요한데?",
        "character": "성민"
      },
      {
        "type": "dialogue",
        "text": "(눈물) ... 오백. 아니, 그냥 더 많이. 그러니까, 그냥 일하겠다고요.",
        "character": "윤진",
        "emphasis": true
      },
      {
        "type": "action",
        "text": "성민은 의미심장하게 윤진을 보다가 봉투와 쪽지 하나를 건네준다. 쪽지 속에는 주소가 적혀있다. "
      },
      {
        "type": "dialogue",
        "text": "안에는 궁금해하지 마. 누가 다가와도, 말을 걸어도, 아무것도 하지 말고, 그냥... 도망쳐.",
        "character": "성민"
      },
      {
        "type": "action",
        "text": "윤진은 말없이 그것을 받아들인다. "
      }
    ],
    "previewExcerpt": [
      {
        "type": "scene",
        "text": "수정의 집 / N"
      },
      {
        "type": "dialogue",
        "text": "얼마가 필요한데?",
        "character": "성민"
      },
      {
        "type": "dialogue",
        "text": "(눈물) ... 오백. 아니, 그냥 더 많이. 그러니까, 그냥 일하겠다고요.",
        "character": "윤진",
        "emphasis": true
      },
      {
        "type": "action",
        "text": "성민은 의미심장하게 윤진을 보다가 봉투와 쪽지 하나를 건네준다. 쪽지 속에는 주소가 적혀있다. "
      },
      {
        "type": "dialogue",
        "text": "안에는 궁금해하지 마. 누가 다가와도, 말을 걸어도, 아무것도 하지 말고, 그냥... 도망쳐.",
        "character": "성민"
      },
      {
        "type": "action",
        "text": "윤진은 말없이 그것을 받아들인다. "
      }
    ],
    "stage": "기획"
  },
  {
    "id": "oneandonly",
    "title": "오직 당신의 것 EP.01",
    "format": "AI 숏드라마 1화 · 9:16",
    "credit": "대본 김영건",
    "introduction": "열광하는 관중, 피 튀기는 난투. 덥다 못해 뜨거운 격투기 현장의 케이지 바닥은 생각보다 차갑다. 그건 결국, 그 바닥에 내동댕이쳐진 패자들만이 알 수 있는 것. 만년 파이터 지망생 차도윤처럼.",
    "excerptLabel": "대본 · S#6 발췌",
    "workHref": "/works/oneandonly/",
    "excerpt": [
      {
        "type": "scene",
        "text": "EXT. 외진 길 / D"
      },
      {
        "type": "action",
        "text": "일제히 당겨지는 활시위, 다가오는 창에서 -"
      },
      {
        "type": "dialogue",
        "character": "여주(E)",
        "text": "멈추어라!"
      },
      {
        "type": "action",
        "text": "곧 가마에서 내리는 한 여인. 장옷 때문에 얼굴이 잘 보이지 않는다. 장옷을 걷으면 – 웅성이는 포졸들. 남주도 올려다보는데, 역광 때문에 옆모습의 실루엣만 보이고."
      },
      {
        "type": "dialogue",
        "character": "장수1(!)",
        "text": "(급하게 말에서 내려 엎드리며) 정.. 정경부인!"
      },
      {
        "type": "action",
        "text": "일제히 엎드려 인사를 올리는 포졸과 장수. 여주가 돌아서면, 옆얼굴이 드러난다. 남주 빤히 보는데 – 커지는 동공."
      },
      {
        "type": "action",
        "text": "FLASHCUT>- 애인의 옆모습. 다친 남주에게 약을 발라주고 있다."
      }
    ],
    "previewExcerpt": [
      {
        "type": "scene",
        "text": "EXT. 외진 길 / D"
      },
      {
        "type": "action",
        "text": "일제히 당겨지는 활시위, 다가오는 창에서 -"
      },
      {
        "type": "dialogue",
        "character": "여주(E)",
        "text": "멈추어라!"
      },
      {
        "type": "dialogue",
        "character": "장수1(!)",
        "text": "(급하게 말에서 내려 엎드리며) 정.. 정경부인!",
        "emphasis": true
      },
      {
        "type": "action",
        "text": "일제히 엎드려 인사를 올리는 포졸과 장수. 여주가 돌아서면, 옆얼굴이 드러난다. 남주 빤히 보는데 – 커지는 동공."
      }
    ],
    "filmLinkLabel": "완성 영상 보기"
  },
  {
    "id": "firstimpression",
    "title": "첫 인상은 백점, 첫 마디는 엎드려 EP.01",
    "format": "범죄 느와르 로맨스 (1980년대 시대극)",
    "credit": "대본 김영건",
    "introduction": "1986년 서울, 한국의 보니앤클라이드라 불린 연인 강도.\n인질에서 공범으로, 두려움에서 사랑으로, 평범했던 그녀가 서울의 악몽이 되기까지.",
    "excerptLabel": "대본 · S#3 발췌",
    "workHref": "/works/firstimpression/",
    "excerpt": [
      {
        "type": "scene",
        "text": "INT. 은행 통로 / D"
      },
      {
        "type": "action",
        "text": "청원 경찰들이 문을 열어주면 – 안으로 향하는 셋."
      },
      {
        "type": "dialogue",
        "character": "회장",
        "text": "한강의 기적? 그거 다 우리가 만든 거야. 나머지는 그냥 따라온 거고..."
      },
      {
        "type": "action",
        "text": "그 순간, 손이 뒷주머니로 향하는 서진. 곧바로 울리는 총성. 쓰러지는 회장. 총성에 놀란 청원 경찰들이 달려오는데, 서진이 옆에 있던 비상 버튼을 누르자 문이 폐쇄되고 -"
      },
      {
        "type": "dialogue",
        "character": "선희(아무렇지 않은)",
        "text": "인질로 쓰는 거 아니었어?"
      },
      {
        "type": "action",
        "text": "선희가 긴 생머리의 가발을 벗으면 칼단발, 외투를 벗으면, 검은 나시 사이로 문신이 보인다. 서진은 선희에게 키스하고 -"
      },
      {
        "type": "dialogue",
        "character": "서진(미소)",
        "text": "그냥, 짜증 나서."
      }
    ],
    "previewExcerpt": [
      {
        "type": "scene",
        "text": "INT. 은행 통로 / D"
      },
      {
        "type": "dialogue",
        "character": "선희(아무렇지 않은)",
        "text": "인질로 쓰는 거 아니었어?"
      },
      {
        "type": "action",
        "text": "선희가 긴 생머리의 가발을 벗으면 칼단발, 외투를 벗으면, 검은 나시 사이로 문신이 보인다. 서진은 선희에게 키스하고 -"
      },
      {
        "type": "dialogue",
        "character": "서진(미소)",
        "text": "그냥, 짜증 나서.",
        "emphasis": true
      }
    ],
    "filmLinkLabel": "완성 영상 보기"
  }
];
