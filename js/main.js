var SQL_FROM_REGEX = /FROM\s+([^\s;]+)/mi;
var SQL_LIMIT_REGEX = /LIMIT\s+(\d+)(?:\s*,\s*(\d+))?/mi;
var SQL_SELECT_REGEX = /SELECT\s+[^;]+\s+FROM\s+/mi;

var db = null;
var rowCounts = [];
//var editor = ace.edit("sql-editor");
var bottomBarDefaultPos = null, bottomBarDisplayStyle = null;
var errorBox = $("#error");
var lastCachedQueryCount = {};


$.urlParam = function(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
        return null;
    }
    else{
        return results[1] || 0;
    }
};

var fileReaderOpts = {
    readAsDefault: "ArrayBuffer", on: {
        load: function (e, file) {
            loadDB(e.target.result);
        }
    }
};

var selectFormatter = function (item) {
    var index = item.text.indexOf("(");
    if (index > -1) {
        var name = item.text.substring(0, index);
        return name + '<span style="color:#ccc">' + item.text.substring(index - 1) + "</span>";
    } else {
        return item.text;
    }
};

var windowResize = function () {
    positionFooter();
    var container = $("#main-container");
    var cleft = container.offset().left + container.outerWidth();
    $("#bottom-bar").css("left", cleft);
};

var positionFooter = function () {
    var footer = $("#bottom-bar");
    var pager = footer.find("#pager");
    var container = $("#main-container");
    var containerHeight = container.height();
    var footerTop = ($(window).scrollTop()+$(window).height());

    if (bottomBarDefaultPos === null) {
        bottomBarDefaultPos = footer.css("position");
    }

    if (bottomBarDisplayStyle === null) {
        bottomBarDisplayStyle = pager.css("display");
    }

    if (footerTop > containerHeight) {
        footer.css({
            position: "static"
        });
        pager.css("display", "inline-block");
    } else {
        footer.css({
            position: bottomBarDefaultPos
        });
        pager.css("display", bottomBarDisplayStyle);
    }
};

var toggleFullScreen = function () {
    var container = $("#main-container");
    var resizerIcon = $("#resizer i");

    container.toggleClass('container container-fluid');
    resizerIcon.toggleClass('glyphicon-resize-full glyphicon-resize-small');
}
$('#resizer').click(toggleFullScreen);

if (typeof FileReader === "undefined") {
    $('#dropzone, #dropzone-dialog').hide();
    $('#compat-error').show();
} else {
    $('#dropzone, #dropzone-dialog').fileReaderJS(fileReaderOpts);
}

//Initialize editor

//Update pager position
$(window).resize(windowResize).scroll(positionFooter);
windowResize();

$(".no-propagate").on("click", function (el) { el.stopPropagation(); });

//Check url to load remote DB
var loadUrlDB = $.urlParam('url');

/////////////////////////////////////////////////////
var url_date='/Dropbox/DotNetApi';
var list_date=[];
var dbx = new Dropbox.Dropbox({ accessToken: 'jNfuqaYoI3AAAAAAAAAAqvr96aupCnGYWhhPaL2m6A0r6UxWV4nBF8XwARehWV25', fetch: fetch });
dbx.filesListFolder({path: url_date})
		.then(function(response) {
			var a=response.entries;
			a.forEach(function(i){
				if(i.path_lower.indexOf("_resdb.db")>0)
					list_date.push(i.path_lower);
			});

			var tableList = $("#tables");

			for (var i=0;i<list_date.length;i++) {
			    var name = list_date[i];
			    tableList.append('<option value="' + name + '">' + name +  '</option>');
			}

			tableList.select2("val", list_date[0]);
			//doDefaultSelect(list_url[0]);

			$(".chosen-select").chosen({width: "100%"});
			$("#output-box").fadeIn();
			$(".nouploadinfo").hide();
			$("#sample-db-link").hide();
			$("#dropzone").delay(50).animate({height: 50}, 500);
			$("#success-box").show();

			setIsLoading(false);
		})
		.catch(function(error) {
			console.log(error);
		});


/////////////////////////////////////////////////////
var url_full='/Dropbox/DotNetApi/full';
var list_full=[];
dbx.filesListFolder({path: url_full})
		.then(function(response) {
			var a=response.entries;
			a.forEach(function(i){
					list_full.push(i.path_lower);
			});

			var tableList = $("#fullfiles");

			for (var i=0;i<list_full.length;i++) {
			    var name = list_full[i];
			    tableList.append('<option value="' + name + '">' + name +  '</option>');
			}

			tableList.select2("val", list_full[0]);
			//doDefaultSelect(list_url[0]);

			$(".chosen-files").chosen({width: "100%"});

			setIsLoading(false);
		})
		.catch(function(error) {
			console.log(error);
		});


/////////////////////////////////////////////////////
function sumDB(){
  $("#sql-run").prop('disabled', true);
	var fullfiles=$("#fullfiles").chosen().val();
	var tables=$("#tables").chosen().val();
	var full;
	if(fullfiles!=null && fullfiles.length>=1){
		full=fullfiles[0];
	}
	else{
		full=tables[0];
		tables.splice(0, 1);
	}

	if (loadUrlDB == null) {
    setIsLoading(true);
   //////////////
	var now = new Date();
	var list_url=tables;
	var dt=now.toLocaleDateString('en-GB').split('/').join('-');
	var dbx = new Dropbox.Dropbox({ accessToken: 'jNfuqaYoI3AAAAAAAAAAqvr96aupCnGYWhhPaL2m6A0r6UxWV4nBF8XwARehWV25', fetch: fetch });
	var ur='/Dropbox/DotNetApi';
	var url_db='/Dropbox/DotNetApi/merger/02-08-2018_resDB.db';
	///////////////////////////////////////////
			dbx.filesDownload({path: full})
			.then(function(response) {
				var reader = new FileReader();
				reader.onload = function(event) {
					var arrayBuffer = event.target.result;
					try {
						db = new SQL.Database(new Uint8Array(arrayBuffer));
					} catch (ex) {
						setIsLoading(false);
						alert(ex);
					}
				};
				reader.readAsArrayBuffer(response.fileBlob);
				/////////////////////////////////////////////////////
				var k=0;
				for(var i=0;i<list_url.length;i++){
					dbx.filesDownload({path: list_url[i]})
					.then(function(response) {
						var reader = new FileReader();
						reader.onload = function(event) {
							var arrayBuffer = event.target.result;
							combineDB(arrayBuffer);

							if(k==list_url.length-1){
								var data = db.export();
				dbx.filesUpload({path: '/Dropbox/DotNetApi/full/full_resdb.db', contents: data, mode: 'overwrite'});
        $("#ok").text("ok");
        $("#sql-run").prop('disabled', false);

        // var a = document.createElement("a");
        //             document.body.appendChild(a);
        //             a.style = "display: none";
        //     var blob = new Blob(data, {type: "application/octet-stream"}),
        //         url = window.URL.createObjectURL(blob);
        //     a.href = url;
        //     a.download = "full_resdb.sql";
        //     a.click();
        //     window.URL.revokeObjectURL(url);
							}
							k++;
							}
						reader.readAsArrayBuffer(response.fileBlob);
					})
					.catch(function(error) {
						console.log(error);
					});
				}
			})
			.catch(function(error) {
				console.log(error);
			});

}
}

function loadDB(arrayBuffer) {
    setIsLoading(true);

    resetTableList();

    setTimeout(function () {
        var tables;
        try {
            db = new SQL.Database(new Uint8Array(arrayBuffer));

            //Get all table names from master table
            tables = db.prepare("SELECT * FROM sqlite_master WHERE type='table' ORDER BY name");
        } catch (ex) {
            setIsLoading(false);
            alert(ex);
            return;
        }

        var firstTableName = null;
        var tableList = $("#tables");

        while (tables.step()) {
            var rowObj = tables.getAsObject();
            var name = "order";//var name = rowObj.name;

            if (firstTableName === null) {
                firstTableName = name;
            }
            var rowCount = getTableRowsCount(name);
            rowCounts[name] = rowCount;
            tableList.append('<option value="' + name + '">' + name + ' (' + rowCount + ' rows)</option>');
        }

        //Select first table and show It
        tableList.select2("val", firstTableName);
        doDefaultSelect(firstTableName);

        $("#output-box").fadeIn();
        $(".nouploadinfo").hide();
        $("#sample-db-link").hide();
        $("#dropzone").delay(50).animate({height: 50}, 500);
        $("#success-box").show();

        setIsLoading(false);
    }, 50);
}

function getTableRowsCount(name) {
    var sel = db.prepare("SELECT COUNT(*) AS count FROM '" + name + "'");
    if (sel.step()) {
        return sel.getAsObject().count;
    } else {
        return -1;
    }
}

function getQueryRowCount(query) {
    if (query === lastCachedQueryCount.select) {
        return lastCachedQueryCount.count;
    }

    var queryReplaced = query.replace(SQL_SELECT_REGEX, "SELECT COUNT(*) AS count_sv FROM ");

    if (queryReplaced !== query) {
        queryReplaced = queryReplaced.replace(SQL_LIMIT_REGEX, "");
        var sel = db.prepare(queryReplaced);
        if (sel.step()) {
            var count = sel.getAsObject().count_sv;

            lastCachedQueryCount.select = query;
            lastCachedQueryCount.count = count;

            return count;
        } else {
            return -1;
        }
    } else {
        return -1;
    }
}

function getTableColumnTypes(tableName) {
    var result = [];
    var sel = db.prepare("PRAGMA table_info('" + tableName + "')");

    while (sel.step()) {
        var obj = sel.getAsObject();
        result[obj.name] = obj.type;
        /*if (obj.notnull === 1) {
            result[obj.name] += " NOTNULL";
        }*/
    }

    return result;
}

function resetTableList() {
    var tables = $("#tables");
    rowCounts = [];
    tables.empty();
    tables.append("<option></option>");
    tables.select2({
        placeholder: "Select a table",
        formatSelection: selectFormatter,
        formatResult: selectFormatter
    });
    tables.on("change", function (e) {
        doDefaultSelect(e.val);
    });
}

function setIsLoading(isLoading) {
    var dropText = $("#drop-text");
    var loading = $("#drop-loading");
    if (isLoading) {
        dropText.hide();
        loading.show();
    } else {
        dropText.show();
        loading.hide();
    }
}

function extractFileNameWithoutExt(filename) {
    var dotIndex = filename.lastIndexOf(".");
    if (dotIndex > -1) {
        return filename.substr(0, dotIndex);
    } else {
        return filename;
    }
}

//window.addEventListener("focus", function() {
    //var a="abc";
//});
//window.addEventListener("blur", function() {
    //var a="abc";
//});
//window.addEventListener("resume", function() {
    //var a="abc";
//});



function dropzoneClick() {
    $("#dropzone-dialog").click();
}

function doDefaultSelect(name) {
    var defaultSelect = "SELECT * FROM '" + name + "' order by starttime desc LIMIT 0,30";
    editor.setValue(defaultSelect, -1);
    renderQuery(defaultSelect);
}

function executeSql() {
    var query = editor.getValue();
    renderQuery(query);
    $("#tables").select2("val", getTableNameFromQuery(query));
}

function executeSql_para(query) {
    renderQuery(query);
    $("#tables").select2("val", getTableNameFromQuery(query));
}

function getTableNameFromQuery(query) {
    var sqlRegex = SQL_FROM_REGEX.exec(query);
    if (sqlRegex != null) {
        return sqlRegex[1].replace(/"|'/gi, "");
    } else {
        return null;
    }
}

function parseLimitFromQuery(query, tableName) {
    var sqlRegex = SQL_LIMIT_REGEX.exec(query);
    if (sqlRegex != null) {
        var result = {};

        if (sqlRegex.length > 2 && typeof sqlRegex[2] !== "undefined") {
            result.offset = parseInt(sqlRegex[1]);
            result.max = parseInt(sqlRegex[2]);
        } else {
            result.offset = 0;
            result.max = parseInt(sqlRegex[1]);
        }

        if (result.max == 0) {
            result.pages = 0;
            result.currentPage = 0;
            return result;
        }

        if (typeof tableName === "undefined") {
            tableName = getTableNameFromQuery(query);
        }

        var queryRowsCount = getQueryRowCount(query);
        if (queryRowsCount != -1) {
            result.pages = Math.ceil(queryRowsCount / result.max);
        }
        result.currentPage = Math.floor(result.offset / result.max) + 1;
        result.rowCount = queryRowsCount;

        return result;
    } else {
        return null;
    }
}

function setPage(el, next) {
    if ($(el).hasClass("disabled")) return;

    var query = editor.getValue();
    var limit = parseLimitFromQuery(query);

    var pageToSet;
    if (typeof next !== "undefined") {
        pageToSet = (next ? limit.currentPage : limit.currentPage - 2 );
    } else {
        var page = prompt("Go to page");
        if (!isNaN(page) && page >= 1 && page <= limit.pages) {
            pageToSet = page - 1;
        } else {
            return;
        }
    }

    var offset = (pageToSet * limit.max);
    editor.setValue(query.replace(SQL_LIMIT_REGEX, "LIMIT " + offset + "," + limit.max), -1);

    executeSql();
}

function refreshPagination(query, tableName) {
    var limit = parseLimitFromQuery(query, tableName);
    if (limit !== null && limit.pages > 0) {

        var pager = $("#pager");
        pager.attr("title", "Row count: " + limit.rowCount);
        pager.tooltip('fixTitle');
        pager.text(limit.currentPage + " / " + limit.pages);

        if (limit.currentPage <= 1) {
            $("#page-prev").addClass("disabled");
        } else {
            $("#page-prev").removeClass("disabled");
        }

        if ((limit.currentPage + 1) > limit.pages) {
            $("#page-next").addClass("disabled");
        } else {
            $("#page-next").removeClass("disabled");
        }

        $("#bottom-bar").show();
    } else {
        $("#bottom-bar").hide();
    }
}

function showError(msg) {
    $("#data").hide();
    $("#bottom-bar").hide();
    errorBox.show();
    errorBox.text(msg);
}

function htmlEncode(value){
  return $('<div/>').text(value).html();
}

function renderQuery(query) {
    var dataBox = $("#data");
    var thead = dataBox.find("thead").find("tr");
    var tbody = dataBox.find("tbody");

    thead.empty();
    tbody.empty();
    errorBox.hide();
    dataBox.show();

    var columnTypes = [];
    var tableName = getTableNameFromQuery(query);
    if (tableName != null) {
        columnTypes = getTableColumnTypes(tableName);
    }

    var sel;
    try {
        sel = db.prepare(query);
    } catch (ex) {
        showError(ex);
        return;
    }

    var addedColums = false;
   var stt=1;
   var total=0;
    while (sel.step()) {
        if (!addedColums) {
            addedColums = true;
		if(tableName=="order"){
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">stt</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">table</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">price</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">in</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">out</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">check</span></th>');
		   }
		   else{
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">stt</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">food&drink</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">price</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">sl</span></th>');
		   thead.append('<th><span data-toggle="tooltip" data-placement="top" title="string">total</span></th>');
		   }
            /*var columnNames = sel.getColumnNames();
            for (var i = 0; i < columnNames.length; i++) {
                var type = columnTypes[columnNames[i]];
                thead.append('<th><span data-toggle="tooltip" data-placement="top" title="' + type + '">' + columnNames[i] + "</span></th>");
            }*/
        }

        var tr = $('<tr>');
        var s = sel.get();
        for (var i = 0; i < s.length; i++) {
           if(i==0){
               tr.append('<td><span title="' + htmlEncode(s[i]) + '">' + stt + '</span></td>');
           }
           else if(tableName=="order"){
              if(i==2){
                 total+=s[i];
                 var t=s[i];
                 tr.append('<td><span title="' + htmlEncode(s[i]) + '">' + htmlEncode(Number(t).toLocaleString()) + '</span></td>');
              }
              else{
                 if(i==3 || i==4){
                     var bb="";
                     if(s[i]!=null){
                        bb=s[i].toString().split(' ')[1];
                     }
                     tr.append('<td><span title="' + htmlEncode(s[i]) + '">' + htmlEncode(bb) + '</span></td>');
                 }
                 else if(i==5){
                  if(s[i]=="1"){
                     tr.append('<td><span style="background-color:green" title="' + htmlEncode(s[i]) + '">_____</span></td>');
                  }
                    else{
                     tr.append('<td><span style="background-color:red" title="' + htmlEncode(s[i]) + '">_____</span></td>');
                    }
                 }
                 else
                  tr.append('<td><span title="' + htmlEncode(s[i]) + '">' + htmlEncode(s[i]) + '</span></td>');
              }
           }
            else{
               if(i==2){
                  tr.append('<td><span title="' + htmlEncode(s[i]) + '">' + Number(s[i]).toLocaleString() + '</span></td>');
               }
		else if(i==4){
			var price=s[2];
			var sl=s[3]
			var tt=price*sl;
			total+=tt;
                  tr.append('<td><span title="' + htmlEncode(s[i]) + '">' + Number(tt).toLocaleString() + '</span></td>');
               }
               else{
                  tr.append('<td><span title="' + htmlEncode(s[i]) + '">' + htmlEncode(s[i]) + '</span></td>');
               }

            }
        }
        tbody.append(tr);
       stt++;
    }
   $('#total').text("Total: "+Number(total).toLocaleString());
    refreshPagination(query, tableName);

    $('[data-toggle="tooltip"]').tooltip({html: true});
    dataBox.editableTableWidget();

    setTimeout(function () {
        positionFooter();
    }, 100);
}
