var config = require('./constant.js')

let fs = require('fs');

PDFParser = require("pdf2json");
const path = require('path');

const converter = require('json-2-csv');
//database
const nedb_promise = require('nedb-promise');

const db = {};
db.eichholtz = new nedb_promise({
	// filename: nedb_file_name,
	filename: 'list-items.nedb',
	autoload : true
});

//const dirpath = "C:\\pdf\\all";　　//指定のディレクトリ名
const dirpath = "C:\\web-crawler\\download/";　　//指定のディレクトリ名
const targetDate = readCSV();

async function main(_date){
    // id extarction
    const results = await db.eichholtz.find({date:_date});
  
    let readResult = []

    for(let i=0;i<results.length;i++){

        try{
//            let fileDir = dirpath + results[i].eichholtz_id + "/" + results[i].eichholtz_id + ".pdf" 
            let fileDir = dirpath + targetDate.replace(/\-/g,'') + '_PDF/' + results[i].eichholtz_id + ".pdf" 

            // file exit check
            if( checkDir(fileDir) ){

                // read PDF
                let pdfParser = new PDFParser();
                pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
                pdfParser.on("pdfParser_dataReady", pdfData => {
        
                    // fs.writeFile("./pdftest.json", JSON.stringify(pdfData));
                    // let json = JSON.stringify(pdfData);
                    let json = pdfData;
                
                    let list = json.formImage.Pages[0].Texts
                
                    let title = []
                    let detail = []
                
                    for(let i=0;i<list.length;i++){
                        let locationX = list[i].x
                        let locationY = list[i].y
                        let text = decodeURIComponent(list[i].R[0].T)
                
                        if(locationX < 2){
                            
                            title.push({y:locationY, data:text})
                        }else{
                            detail.push({y:locationY, data:text})
                        }
                
                    }
                
                    title.sort((a,b) => (a.y > b.y) ? 1 : ((b.y > a.y) ? -1 : 0))
                    detail.sort((a,b) => (a.y > b.y) ? 1 : ((b.y > a.y) ? -1 : 0))
                
                    readResult.push({
                        '商品コード' : searchDetail(title,detail,'Item no.',false, ' '),
                        '商品名' : results[i].eichholtz_name,
                        'TRADE' : results[i].eichholtz_price,
                        'CBM' : changeString(searchDetail(title,detail,'Volume',false, ' & ')),
                        '商品重量' : searchDetail(title,detail,'Net weight (kg)',false, ' '),
                        '商品サイズ' : changeString(searchDetail(title,detail,'Dimensions (cm)',false, ' ')),
                        '梱包後サイズ' : changeString(searchDetail(title,detail,'Package measurements',false, ' & ')),
                        '備考' : changeString(searchDetail(title,detail,'Lamp holder type',true, ' ')),
                        '素材' : searchDetail(title,detail,'Material(s)',false, ' '),
                        '原産国' : searchDetail(title,detail,'Country of origin',false, ' '),
                    })
            
                    // convert JSON array to CSV string
                    converter.json2csv(readResult, (err, csv) => {
                        if (err) {
                            throw err;
                        }
                        // write CSV to a file
                        fs.writeFileSync('pdfdetails_' + _date + '.csv', csv);
                    });
        
        
                });
                await pdfParser.loadPDF(fileDir);
                //   await pdfParser.loadPDF("C://pdf/all/" + flst[i]);
            }else{
                // not exist file
                console.log('Not Exist File:' + results[i].eichholtz_id)
            }

        }catch(e){
            console.log(e)
            console.log('Error ID:' + results[i].eichholtz_id)
        }
    }
}

main(targetDate)

function searchDetail(title, detail, search, flag, moji){
    if( title && detail && search){

        let startY = null
        let endY = null

        let result = ''

        for(let i=0; i< title.length; i++){
            if( (title[i].data == search && !flag ) ||
                (title[i].data.match(search) && flag) ){

                startY = title[i].y
                endY = title[i+1] ? title[i+1].y : title[i].y
                for(let j=0; j< detail.length; j++){
                    if( (startY <= detail[j].y && detail[j].y < endY) ||
                        (startY == endY && startY <= detail[j].y)
                    ){
                        if(result.length == '' ){
                            result = detail[j].data;
                        }else{
                            result += moji + detail[j].data;
                        }
                    }
                }
    
            }
        }
        return result
    }
}

/**
* String change
* 123.123.123,00 -> 123,123,123.00
* @param String
*/
function changeString(_string){

    // _string = _string.replace(/\./g,'#')
    _string = _string.replace(/,/g,'.')
    // _string = _string.replace(/#/g,',')

	return _string;
}

function checkDir( filedir ){

    // check dir
     if ( fs.existsSync( filedir )) {
         return true
     }else{
         return false
     }

}
function readCSV( _number ){

    let data = []

    if (fs.existsSync( config.date )) {
        data = fs.readFileSync( config.date , 'utf8')
       	dataArray = data.split(/\r?\n/);
        
    }else{
        console.log('cound not find the following file: ' + config.date)
    }
	
	if( _number ){
	    return dataArray[dataArray.length - 2 - _number]
	}else{
		return dataArray[dataArray.length - 2]
	}
}
