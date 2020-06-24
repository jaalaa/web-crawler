echo off

echo arg1: %1

set USR_INPUT_STR=
set USR_INPUT_DBREAD=

set /P USR_INPUT_STR="画像・PDFファイルのダウンロードを開始しますか(Y/N): "


if "%USR_INPUT_STR%" neq "Y" (
	
	echo ジョブ終了
	set /P USR_INPUT_STR=
	exit

)

set /P USR_INPUT_DBREAD="DBの新規商品をダウンロードします(Y/N): "

if "%USR_INPUT_DBREAD%" == "Y" (

	echo DBチェックしたうえでダウンロード開始します

	rem call
	call node C:\web-crawler\download.js Y

	set /P USR_INPUT_STR="ダウンロード終了します "

) else (

	echo 設定ファイルのみでダウンロードします

	rem call
	call node C:\web-crawler\download.js N
	
	set /P USR_INPUT_STR="ダウンロード終了します "

)


