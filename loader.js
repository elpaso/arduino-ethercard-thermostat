// Config
var room_names = [
  'Camera P',
  'Camera A',
  'Sala',
  'Camera O',
  'Bagno'
];

var UTC=1;
var set_didx;
var set_pidx;
var set_slot;

function loadScript(url, callback){

    var script = document.createElement("script")
    script.type = "text/javascript";

    if (script.readyState){  //IE
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" ||
                    script.readyState == "complete"){
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {  //Others
        script.onload = function(){
            callback();
        };
    }

    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

var headID = document.getElementsByTagName("head")[0];

var newLink = document.createElement('link');
newLink.rel = "stylesheet";
newLink.href = "http://code.jquery.com/mobile/1.1.1/jquery.mobile-1.1.1.min.css";
headID.appendChild(newLink);

var newTitle = document.createElement('title');
newTitle.innerHTML="Controllo riscaldamento";
headID.appendChild(newTitle);


var newStyle = document.createElement('style');
newStyle.innerHTML +='table.program-table td {border: solid 1px white; text-align:center;}';
newStyle.innerHTML +='table.program-table th {border: solid 1px white; text-align:center;}';
newStyle.innerHTML +='table.program-table {border-collapse: collapse;}';
newStyle.innerHTML +='.T0 {background-color: #99FFFF;}';
newStyle.innerHTML +='.T1 {background-color: #FFFF33;}';
newStyle.innerHTML +='.T2 {background-color: #FF6600;}';
newStyle.innerHTML +='.T3 {background-color: #FF0000;text-shadow: none !important;}';

headID.appendChild(newStyle);


var newMeta = document.createElement('meta');
newMeta.name="viewport";
newMeta.content="width=device-width, initial-scale=1";
headID.appendChild(newMeta);

/* Commands */
var  CMD_ROOM_SET_PGM = 1;
var  CMD_WRITE_EEPROM = 2;
var  CMD_TIME_SET = 3;
var  CMD_TEMPERATURE_SET = 4;
var  CMD_RESET = 5;
var  CMD_W_PGM_SET_D_PGM =  6;
var  CMD_D_PGM_SET_T_PGM = 7;
var  CMD_SLOT_SET_UPPER_BOUND = 8;
var  CMD_CLEAR_EEPROM = 9;
var  CMD_SET_RISE_TEMP_TIME_S = 10;
var  CMD_SET_RISE_DELTA = 11;
var  CMD_SET_BLOCKED_TIME_S = 12
var  CMD_SET_HYSTERESIS = 13
var  CMD_UNBLOCK = 14


function ws_call(cmd, parms, callback){
    var url = "/?c="+cmd;
    parms = parms || [];
    callback = callback || function(data){console.log(data);};
    if(parms.length){
        url += '&p=' + parms[0];
    }
    if(parms.length > 1){
        url += '&v=' + parms[1];
    }
    if(parms.length > 2){
        url += '&w=' + parms[2];
    }
    $.getJSON( url ,
        callback
    );
}

function set_time(){
    var d = new Date();
    // 0 = hh, 1 = mm, 2 = ss, 3 = Y, 4 = m, 5 = d
    ws_call(CMD_TIME_SET, [0, d.getHours()]);
    ws_call(CMD_TIME_SET, [1, d.getMinutes()]);
    ws_call(CMD_TIME_SET, [2, d.getSeconds()]);
}

function set_date(){
    var d = new Date();
    // 0 = hh, 1 = mm, 2 = ss, 3 = Y, 4 = m, 5 = d
    ws_call(CMD_TIME_SET, [3, d.getFullYear()]);
    ws_call(CMD_TIME_SET, [4, d.getMonth() + 1]);
    ws_call(CMD_TIME_SET, [5, d.getDate()]);
}

function change_program(pgm){
    ws_call(CMD_ROOM_SET_PGM, [window.location.hash.match(/room-(\d)-/)[1], pgm]);
    // Close dialog
    $('.ui-dialog').dialog('close');
}


function eeprom_write(){
    ws_call(CMD_WRITE_EEPROM);
}

function eeprom_clear(){
    if(confirm('Cancella la EEPROM?\nRiavviando la scheda verranno caricate le impostazioni di default.')){
        ws_call(CMD_CLEAR_EEPROM);
    }
}



function change_dpt(value){
    $('#t-dlg-page').dialog('close');
    ws_call(CMD_D_PGM_SET_T_PGM, [set_pidx, set_slot, value], function(){
        $.getJSON( "/programs" , function(data) {
            json_data.programs = data;
            update_gui();
        });
    });
}


// Global
var json_data = {};

var page_tpl = '\
<script id="room-tpl" type="text/x-jquery-tmpl">\
 <div id="room-${idx}-page" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>${name}</h1>\
    </div>\
    <div data-role="content">\
        <h3 ><span class="t">${t}</span>°C</h3>\
        <p>Stato: <b class="s">${status}</b></p>\
        <p>Programma: <span class="p"><a class="ui-link" href="#program-${p}-page" data-rel="dialog">${program_name}</a></span> <a href="#program-dlg-page" data-role="button" data-inline="true" data-transition="fade" data-rel="dialog">Cambia</a></p>\
        <h3>desiderata: <span class="T">${T}</span>°C</h3>\
        <p><a href="#rooms-page" data-direction="reverse" data-role="button" data-icon="back">Indietro</a></p>\
    </div>\
  </div>\
</script>\
\
<script id="program-tpl" type="text/x-jquery-tmpl">\
 <div id="program-${pidx}-page" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Programma ${name}</h1>\
    </div>\
    <div data-role="content">\
        <table class="program-table">\
            <thead>\
                <tr><th>&nbsp;</th><th>0/{{each slot}}${value}</th><th id="slot-${sidx}">${value}/{{/each}}24</th></tr>\
            </thead>\
            <tbody id="program-${pidx}-tbody">\
            {{each day}}\
                <tr><th>${day_name}</th>{{each temperature}}<td  class="pgm-T" id="PT-${pidx}-${didx}-${tidx}" class="T${tindex}">${value}°</td>{{/each}}</tr>\
            {{/each}}\
            </tbody>\
        </table>\
    </div>\
  </div>\
</script>\
\
\
<script id="daily-program-dlg-tpl" type="text/x-jquery-tmpl">\
 <div id="daily-program-${dpidx}-page" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Programma giornaliero ${dpidx}</h1>\
    </div>\
    <div data-role="content">\
        <table class="program-table">\
            <thead>\
                <tr><th>0/{{each slot}}${value}</th><th id="slot-${sidx}">${value}/{{/each}}24</th></tr>\
            </thead>\
            <tbody id="program-${dpidx}-tbody">\
                <tr>{{each temperature}}<td  class="dpgm-T T${tindex}" id="DPT-${dpidx}-${$index}">${tvalue}°</td>{{/each}}</tr>\
            </tbody>\
        </table>\
    </div>\
  </div>\
</script>\
\
<script id="program-dlg-tpl" type="text/x-jquery-tmpl">\
 <div id="program-dlg-page" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Scegli il nuovo programma</h1>\
    </div>\
    <div data-role="content">\
        <ul id="program-menu" data-role="listview" data-inset="true" data-filter="false">\
            {{each program}}<li><a href="javascript:change_program(${pidx})">${name}</a></li>{{/each}}\
        </ul>\
    </div>\
  </div>\
</script>\
\
\
<script id="t-dlg-tpl" type="text/x-jquery-tmpl">\
 <div id="t-dlg-page" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Scegli la nuova temperatura</h1>\
    </div>\
    <div data-role="content">\
        <ul id="t-menu" data-role="listview" data-filter="false">\
             {{each temperature}}<li><a class="T${$index}" href="javascript:change_dpt(${$index}, this)">${$value}° <span class="current">(attuale)</span></a></li>{{/each}}\
        </ul>\
    </div>\
  </div>\
</script>\
\
\
<script id="program-list-tpl" type="text/x-jquery-tmpl">\
 <div id="setup-page-programs" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Scegli il programma</h1>\
    </div>\
    <div data-role="content">\
        <ul id="program-menu" data-role="listview" data-inset="true" data-filter="false">\
            {{each program}}<li><a  data-rel="dialog" href="#daily-program-${pidx}-page">${name}</a></li>{{/each}}\
        </ul>\
    </div>\
    <p><a href="#setup-page" data-direction="reverse" data-role="button"  data-icon="back">Impostazioni</a></p>\
  </div>\
</script>\
\
\
<script id="daily-program-list-tpl" type="text/x-jquery-tmpl">\
 <div id="setup-page-programs" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Scegli il programma</h1>\
    </div>\
    <div data-role="content">\
        <ul id="daily-program-menu" data-role="listview" data-inset="true" data-filter="false">\
            {{each program}}<li><a  data-rel="dialog" href="#daily-program-${$index}-page">Programma giornaliero ${$index}</a></li>{{/each}}\
        </ul>\
    </div>\
    <p><a href="#setup-page" data-direction="reverse" data-role="button"  data-icon="back">Impostazioni</a></p>\
  </div>\
</script>\
\
\
<!-- End Scripts -->\
\
\
<div data-role="content">\
    <div class="message-box">\
        <div class="inner">\
            <p id="msg-txt"></p>\
        </div>\
    </div>\
</div>\
\
\<div id="home-page" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Riscaldamento</h1>\
    </div>\
    <div data-role="content">\
        <h2>Pompa centrale: <span id="pump-status"></span></h2>\
        <div id="blocked" style="display: none; color: red"><h2>Sistema bloccato!</h2>\
            <p>Sblocco alle <b id="unlock-time"></b></p>\
        </div>\
        <h3>Mandata: <span id="hot"></span>°C &mdash; ritorno: <span id="cold"></span>°C</h3>\
        <h3>Data: <span id="data"></span> <a onclick="javascript:set_date()" data-role="button" data-inline="true" data-transition="fade" href="#">Sincronizza con il dispositivo</a></h3><h3>Ora: <span id="ora"></span> <a onclick="javascript:set_time()" data-role="button" data-inline="true" data-transition="fade" href="#">Sincronizza con il dispositivo</a></h2>\
            <p><a href="#rooms-page" data-icon="arrow-r" data-role="button">Stanze</a></p>\
            <p><a href="#setup-page" data-icon="arrow-r" data-role="button">Impostazioni</a></p>\
            <p><a href="#stats-page" data-icon="arrow-r" data-role="button">Statistiche</a></p>\
    </div>\
</div>\
<div id="rooms-page" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Controllo stanze</h1>\
    </div>\
    <div data-role="content">\
        <ul id="rooms-list" data-role="listview" data-inset="true" data-filter="false">\
        </ul>\
        <p><a href="#home-page" data-direction="reverse" data-role="button" data-icon="back">Home</a></p>\
    </div>\
</div>\
\
<div id="setup-page" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Impostazioni</h1>\
    </div>\
    <div data-role="content">\
        <p><a onclick="javascript:ws_call(CMD_UNBLOCK);" data-role="button" href="#">Sblocca subito</a></p>\
        <p><a href="#setup-page-temp"  data-icon="arrow-r" data-role="button">Temperature</a></p>\
        <p><a href="#setup-page-slot"  data-icon="arrow-r" data-role="button">Fasce orarie</a></p>\
        <p><a href="#setup-page-programs"  data-icon="arrow-r" data-role="button">Programmi giornalieri</a></p>\
        <p><a onclick="javascript:eeprom_write()" data-role="button" data-transition="fade" data-icon="alert" href="#">Salva in EEPROM</a></p>\
        <p><a onclick="javascript:eeprom_clear()" data-role="button" data-transition="fade" data-icon="alert" href="#">Cancella la EEPROM (reset)</a></p>\
        <p><a href="#home-page" data-direction="reverse" data-role="button"  data-icon="back">Home</a></p>\
    </div>\
</div>\
<div id="setup-page-temp" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Temperature</h1>\
    </div>\
    <div data-role="content">\
    <p><a href="#setup-page" data-direction="reverse" data-role="button"  data-icon="back">Impostazioni</a></p>\
        <div data-role="fieldcontain" class="T">\
            <label for="slider-T1">T1 (economy)</label>\
            <input type="range" name="slider-T1" id="slider-T1" value="" step="0.5" min="5" max="25"  />\
        </div>\
        <div data-role="fieldcontain" class="T">\
            <label for="slider-T2">T2 (normal)</label>\
            <input type="range" name="slider-T2" id="slider-T2" value="" step="0.5" min="5" max="25"  />\
        </div>\
        <div data-role="fieldcontain" class="T">\
            <label for="slider-T3">T3 (comfort)</label>\
            <input type="range" name="slider-T3" id="slider-T3" value="" step="0.5" min="5" max="25"  />\
        </div>\
        <div data-role="fieldcontain" class="r">\
            <label for="slider-DELTA">Diff. °C mandata/ritorno</label>\
            <input type="range" name="slider-DELTA" id="slider-DELTA" value="" step="0.5" min="1" max="20"  />\
        </div>\
        <div data-role="fieldcontain" class="t">\
            <label for="slider-TIME">Tempo blocco (secondi)</label>\
            <input type="range" name="slider-TIME" id="slider-TIME" value="" step="10" min="120" max="1200"  />\
        </div>\
        <div data-role="fieldcontain" class="b">\
            <label for="slider-BLOCK">Tempo sblocco (secondi)</label>\
            <input type="range" name="slider-BLOCK" id="slider-BLOCK" value="" step="10" min="1800" max="7200"  />\
        </div>\
        <div data-role="fieldcontain" class="h">\
            <label for="slider-HYST">Isteresi</label>\
            <input type="range" name="slider-HYST" id="slider-HYST" value="" step="0.5" min="0" max="20"  />\
        </div>\
        <p><a href="#home-page" data-direction="reverse" data-role="button"  data-icon="back">Home</a></p>\
    </div>\
</div>\
<div id="setup-page-slot" data-role="page" data-theme="b">\
    <div data-role="header">\
        <h1>Temperature</h1>\
    </div>\
    <div data-role="content">\
    <p><a href="#setup-page" data-direction="reverse" data-role="button"  data-icon="back">Impostazioni</a></p>\
        <div data-role="fieldcontain" class="S">\
            <label for="slider-S1">Slot 1 da mezzanote a</label>\
            <input type="range" name="slider-S1" id="slider-S1" value="" step="1" min="0" max="1440"  />\
        </div>\
        <div data-role="fieldcontain" class="S">\
            <label for="slider-S2">Slot 2 da slot 1 a</label>\
            <input type="range" name="slider-S2" id="slider-S2" value="" step="1" min="0" max="1440"  />\
        </div>\
        <div data-role="fieldcontain" class="S">\
            <label for="slider-S3">Slot 3 da slot 2 a</label>\
            <input type="range" name="slider-S3" id="slider-S3" value="" step="1" min="0" max="1440"  />\
        </div>\
        <div data-role="fieldcontain" class="S">\
            <label for="slider-S4">Slot 4 da slot 3 a</label>\
            <input type="range" name="slider-S4" id="slider-S4" value="" step="1" min="0" max="1440"  />\
        </div>\
        <div data-role="fieldcontain" class="S">\
            <label for="slider-S5">Slot 5 da slot 4 a</label>\
            <input type="range" name="slider-S5" id="slider-S5" value="" step="1" min="0" max="1440"  />\
        </div>\
        <div data-role="fieldcontain" class="S">\
            <label for="slider-S6">Slot 6 da slot 5 a</label>\
            <input type="range" name="slider-S6" id="slider-S6" value="" step="1" min="0" max="1440"  />\
        </div>\
        <div data-role="fieldcontain" class="S">\
            <label for="slider-S7">Slot 7 da slot 6 a</label>\
            <input type="range" name="slider-S7" id="slider-S7" value="" step="1" min="0" max="1440"  />\
        </div>\
        <p><a href="#home-page" data-direction="reverse" data-role="button"  data-icon="back">Home</a></p>\
    </div>\
</div>';

document.getElementsByTagName("body")[0].innerHTML = page_tpl;


var room_status = {
  'O': 'Riscaldamento in corso',
  'V': 'Apertura valvola',
  'B': 'Blocco',
  'C': 'Nessuna richiesta di calore'
};



var room_daily_program_names = [
    'Sempre T0 (antigelo)',
    'Sempre T1',
    'Sempre T2',
    'Sempre T3',
    'Risveglio, cena e sera',
    'Risveglio, pasti e sera',
    'Risveglio, pasti, pomeriggio e sera',
    'Tutto il giorno'
];

var day_names = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
var slots = [0, 1, 2, 3, 4, 5, 6, 7];


var room_program_names = [
    room_daily_program_names[0],
    room_daily_program_names[1],
    room_daily_program_names[2],
    room_daily_program_names[3],
    'lun-ven: ' +  room_daily_program_names[4] + ' sab-dom: ' + room_daily_program_names[7],
    'lun-sab: ' +  room_daily_program_names[4] + ' dom: ' + room_daily_program_names[7],

    'lun-ven: ' +  room_daily_program_names[5] + ' sab-dom: ' + room_daily_program_names[7],
    'lun-sab: ' +  room_daily_program_names[5] + ' dom: ' + room_daily_program_names[7],

    'lun-ven: ' +  room_daily_program_names[6] + ' sab-dom: ' + room_daily_program_names[7],
    'lun-sab: ' +  room_daily_program_names[6] + ' dom: ' + room_daily_program_names[7],
]

function get_t (temps, slot){
    var r = 0;
    var tst = 128 >> slot;
    $.each([0, 1, 2, 3], function(k,v){
        if(temps[k] & tst){
             r = k;
        }
    });
    return r;
}


function update_gui(){
    var data = new Date((json_data.status.u - 3600*UTC)*1000);
    $('#data').html(data.toLocaleDateString());
    $('#ora').html(data.toLocaleTimeString());
    $('#hot').html(json_data.status.h);
    $('#cold').html(json_data.status.c);
    $('#pump-status').html(json_data.status.P ? 'accesa' : 'spenta');
    if(json_data.status.b){
        $('#blocked').show();
         var data = new Date((json_data.status.b - 3600*UTC)*1000);
        $('#unlock-time').html(data.toLocaleTimeString());
    } else {
        $('#blocked').hide();
    }
    $.each(json_data.status.R, function(k,v){
        v['idx'] = k;
        v['status'] = room_status[v.s];
        v['program_name'] = room_program_names[v.p];
        // Update elements
        $('#room-' + k + '-details').html(v.t + '° (' + v.T + '°) ' + room_status[v.s]);
        $('#room-' + k + '-page .s').html(v['status'] = room_status[v.s]);
        $('#room-' + k + '-page .t').html(v['status'] = v.t);
        $('#room-' + k + '-page .T').html(v['status'] = v.T);
        $('#room-' + k + '-page .p').html('<a class="ui-link" href="#program-' + v.p + '-page" data-rel="dialog">' + room_program_names[v.p] + '</a>');
        $('#room-' + k + '-page .d').html(room_daily_program_names[v.d]);
    });

    $.each(json_data.programs.w, function(pidx,v1){
        //console.log("Programma settimanale ", k1 , v1);
        $.each(slots, function(slot, value){
            //console.log("Lu-Ve", json_data.programs.d[v1[0]]);
            //console.log(get_t(json_data.programs.d[v1[0]], slot));
            $.each([0, 1, 2, 3, 4], function(didx,v2){    // Mo - Fr
                var tindex = get_t(json_data.programs.d[v1[0]], slot);
                $('#PT-' + pidx + '-' + didx + '-' + slot).html(json_data.programs.T[tindex] + '°');
                $('#PT-' + pidx + '-' + didx + '-' + slot).removeClass("T0 T1 T2 T3");
                $('#PT-' + pidx + '-' + didx + '-' + slot).addClass('T' + tindex);
            });
            //console.log("Sa", json_data.programs.d[v1[1]]);
            //console.log(get_t(json_data.programs.d[v1[1]], slot));
            didx = 5;
            var tindex = get_t(json_data.programs.d[v1[1]], slot);
            $('#PT-' + pidx + '-' + didx + '-' + slot).html(json_data.programs.T[tindex] + '°');
            $('#PT-' + pidx + '-' + didx + '-' + slot).removeClass("T0 T1 T2 T3");
            $('#PT-' + pidx + '-' + didx + '-' + slot).addClass('T' + tindex);
            //console.log("Do", json_data.programs.d[v1[2]]);
            //console.log(get_t(json_data.programs.d[v1[2]], slot));
            didx = 6;
            var tindex = get_t(json_data.programs.d[v1[2]], slot);
            $('#PT-' + pidx + '-' + didx + '-' + slot).html(json_data.programs.T[tindex] + '°');
            $('#PT-' + pidx + '-' + didx + '-' + slot).removeClass("T0 T1 T2 T3");
            $('#PT-' + pidx + '-' + didx + '-' + slot).addClass('T' + tindex);

            // Slot sliders
            $('#slider-S' + (slot + 1)).val(json_data.programs.s[slot]*100).slider('refresh');
        });


    });

    $.each(json_data.programs.d, function(pidx, temps){
        $.each(slots, function(slot, value){
            var tindex = get_t(temps, slot);
            $('#DPT-' + pidx + '-' + slot).html(json_data.programs.T[tindex] + '°');
            $('#DPT-' + pidx + '-' + slot).removeClass("T0 T1 T2 T3");
            $('#DPT-' + pidx + '-' + slot).addClass('T' + tindex);
        });
    });




    $.each(json_data.programs.T, function(k,v){
        if(k) {
            $('#slider-T' + k).val(v).slider('refresh');
        }
    });


    $('#slider-BLOCK').val(json_data.programs.b).slider('refresh');
    $('#slider-TIME').val(json_data.programs.t).slider('refresh');
    $('#slider-DELTA').val(json_data.programs.r).slider('refresh');
    $('#slider-HYST').val(json_data.programs.h).slider('refresh');

    // Slot
    $.each(json_data.programs.s, function(k,v){
        $('slot-' + k).html(Math.floor(v/60) + ((v%60) ? ':' + (v%60) : ''));
    });

}


loadScript('http://code.jquery.com/jquery-1.7.1.min.js', function(){
    loadScript('http://code.jquery.com/mobile/1.1.1/jquery.mobile-1.1.1.min.js', function(){
        loadScript('http://ajax.microsoft.com/ajax/jquery.templates/beta1/jquery.tmpl.min.js' , function(){
            $.getJSON( "/status" ,
                function(data) {
                    $.each(data.R, function(k,v){
                        $('#rooms-list').append('<li><a href="#room-' + k + '-page">' + room_names[k] + ' <span id="room-' + k + '-details"></span></a></li>');
                        v['name'] = room_names[k];
                        v['idx'] = k;
                        $( "#room-tpl" ).tmpl(v).appendTo(document.getElementsByTagName("body")[0]);
                    });
                    //$('#rooms-list').listview('refresh');

                    $.getJSON( "/programs" ,
                        function(data) {
                            json_data.programs = data;
                            var pgms = [];
                            var slot = [];
                            // Slots
                            $.each(data.s, function(k,v){
                                v = v*100;
                                slot.push({'sidx': k, 'value':Math.floor(v/60) + ((v%60) ? ':' + (v%60) : '')});
                            });
                            $.each(data.w, function(pidx,v1){
                                var p = {'name':  'Programma ' + pidx, 'pidx': pidx, 'day': [], 'slot': slot };
                                $.each([0, 1, 2, 3, 4], function(didx,v2){
                                    var temps = [];
                                    $.each(slots, function(slot, sv){
                                        var tindex = get_t(json_data.programs.d[v1[0]], slot);
                                        temps.push({'value': data.T[tindex], 'tindex' : tindex, 'tidx': slot});
                                    });
                                    p.day.push({'day_name': day_names[didx], 'didx' : didx, 'temperature' : temps});
                                });
                                // Sa
                                var didx = 5;
                                var temps = [];
                                $.each(slots, function(slot, sv){
                                    var tindex = get_t(json_data.programs.d[v1[1]], slot);
                                    temps.push({'value': data.T[tindex], 'tindex' : tindex, 'tidx': slot});
                                });
                                p.day.push({'day_name': day_names[didx], 'didx' : didx, 'temperature' : temps});
                                // Su
                                var didx = 6;
                                var temps = [];
                                $.each(slots, function(slot, sv){
                                    var tindex = get_t(json_data.programs.d[v1[2]], slot);
                                    temps.push({'value': data.T[tindex], 'tindex' : tindex, 'tidx': slot});
                                });
                                p.day.push({'day_name': day_names[didx], 'didx' : didx, 'temperature' : temps});

                                pgms.push(p);
                            });

                            var daily_pgms = [];
                            $.each(json_data.programs.d, function(k,temps){
                                var pgm = [];
                                $.each(slots, function(slot, value){
                                    var tindex = get_t(temps, slot);
                                    pgm.push({'tindex' : tindex, 'tvalue': json_data.programs.T[tindex]});
                                });
                                daily_pgms.push({'dpidx': k, 'temperature': pgm, 'slot' : slot});
                            });

                            $( "#program-tpl" ).tmpl(pgms).appendTo(document.getElementsByTagName("body")[0]);

                            $( "#program-dlg-tpl" ).tmpl({program: pgms}).appendTo(document.getElementsByTagName("body")[0]);

                            $( "#daily-program-list-tpl" ).tmpl({program: daily_pgms}).appendTo(document.getElementsByTagName("body")[0]);

                            $( "#t-dlg-tpl" ).tmpl({temperature: data.T }).appendTo(document.getElementsByTagName("body")[0]);

                            $( "#daily-program-dlg-tpl" ).tmpl(daily_pgms).appendTo(document.getElementsByTagName("body")[0]);

                            $('#setup-page-slot').page();
                            // Setup events
                            $('#setup-page-temp').page();
                            $( ".T .ui-slider" ).bind( "vmouseup", function(event, ui) {
                                var el = $(event.currentTarget).siblings('input')[0];
                                var id = el.id.replace('slider-T', '');
                                var val = $(el).val();
                                json_data.programs.T[id] = val;
                                // Call
                                ws_call(CMD_TEMPERATURE_SET, [id, val * 100]);
                            });


                            $( ".b .ui-slider" ).bind( "vmouseup", function(event, ui) {
                                var el = $(event.currentTarget).siblings('input')[0];
                                var val = $(el).val();
                                json_data.programs.b = val;
                                // Call
                                ws_call(CMD_SET_BLOCKED_TIME_S, [parseInt(val)]);
                            });

                            $( ".t .ui-slider" ).bind( "vmouseup", function(event, ui) {
                                var el = $(event.currentTarget).siblings('input')[0];
                                var val = $(el).val();
                                json_data.programs.t = val;
                                // Call
                                ws_call(CMD_SET_RISE_TEMP_TIME_S, [parseInt(val)]);
                            });

                            $( ".r .ui-slider" ).bind( "vmouseup", function(event, ui) {
                                var el = $(event.currentTarget).siblings('input')[0];
                                var val = $(el).val();
                                json_data.programs.r = val;
                                // Call
                                ws_call(CMD_SET_RISE_DELTA, [val * 100]);
                            });

                            $( ".h .ui-slider" ).bind( "vmouseup", function(event, ui) {
                                var el = $(event.currentTarget).siblings('input')[0];
                                var val = $(el).val();
                                json_data.programs.h = val;
                                // Call
                                ws_call(CMD_SET_HYSTERESIS, [val * 100]);
                            });

                            // Slot
                            $( ".S .ui-slider" ).bind( "vmouseup", function(event, ui) {
                                var el = $(event.currentTarget).siblings('input')[0];
                                var id = parseInt(el.id.replace('slider-S', ''));
                                var val = $(el).val();
                                json_data.programs.s[id - 1] = val / 100;
                                // Call
                                ws_call(CMD_SLOT_SET_UPPER_BOUND, [id, val]);
                            });


                            $('.dpgm-T').live('vclick', function(event, ui){
                                $.mobile.changePage( "#t-dlg-page", { role: "dialog"} );
                                var t = $(event.target).attr('class').match(/T(\d)/)[1];
                                var a = event.target.id.split(/-/);
                                set_pidx = a[1];
                                set_slot = a[2];
                                $("#t-dlg-page" + ' .current').hide();
                                $("#t-dlg-page .T" + t + ' .current').show();
                            });

                            (function worker() {
                            $.ajax({
                                url: '/status',
                                success: function(data) {
                                    json_data.status = data;
                                    update_gui();
                                },
                                complete: function() {
                                // Schedule the next request when the current one's complete
                                    setTimeout(worker, 4000);
                                }
                            });
                            })();
                        }
                    );
                }
            );
        });
    });
});

