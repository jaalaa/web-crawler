echo off
rem 初期化

echo arg1: %1

rem 定期バッチがチェック

set USR_INPUT_STR=

if "TRUE" == "%1"  (
	rem 定期ジョブ
	
	rem call
	call node C:\web-crawler3\check_update.js 1
	rem call node C:\Users\fuyun\web-crawler\check_update.js 1
			
) else (
	
	rem パラメータ入力
	set /P USR_INPUT_STR="チェック開始しますか(Y/N): "

)

if "%USR_INPUT_STR%" == "Y" (
	echo 非定期バッチの開始

	rem call
	call node C:\web-crawler3\check_update.js 2
	rem call node C:\Users\fuyun\web-crawler\check_update.js 2

	rem パラメータ入力
	set /P USR_INPUT_STR="終了します（OK?）: "

) else (
	echo バッチ終了
)

rem FORFILES /P C:\web-crawler3\upload /D -7 /C "cmd /c del /s /q @file"
FORFILES /P C:\Users\fuyun\web-crawler\upload /D -7 /C "cmd /c del /s /q @file"
