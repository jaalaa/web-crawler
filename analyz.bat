echo off
rem 初期化

echo arg1: %1

rem 定期バッチがチェック

set USR_INPUT_STR=

if "TRUE" == "%1"  (
	rem 定期ジョブ
	
	rem call
	call node C:\web-crawler3\checkwebitems.js 1
			
) else (
	
	rem パラメータ入力
	set /P USR_INPUT_STR="チェック開始しますか(Y/N): "

)

if "%USR_INPUT_STR%" == "Y" (
	echo 非定期バッチの開始

	rem call
	call node C:\web-crawler3\checkwebitems.js 2

	rem パラメータ入力
	set /P USR_INPUT_STR="終了します（OK?）: "

) else (
	echo バッチ終了
)

