/** 
  * A prototype to search and filter Excercises in the eduZEN Excercise-Archive.
  *
  *
 **/

var dmc = new RESTClient("http://localhost:8080/core")
var dict = new eduzenDictionary("DE")
var filter = new function () {

  this.historyApiSupported = window.history.pushState

  this.initSearchView = function () { 

    // registering handler
    $("[name=search]").submit(filter.doSearch)
    window.addEventListener("popstate", function(e) {
      if (e.state) filter.pop_history(e.state)
    })
    // handling deep links
    var entryUrl = window.location.href
    var commandingUrl = entryUrl.substr(entryUrl.indexOf("#") + 1)
    var commands = commandingUrl.split("?")

    if (commands[0] === "dosearch") {
      var value = commands[1].substr(commands[1].indexOf("=") + 1)
      $("[name=searchfield]").val("" + value + "")
      filter.doSearch(value)
    } else if (commands[0] === "doshow") {
      var exId = parseInt(commands[1].substr(commands[1].indexOf("=") + 1))
      filter.showResultItem(undefined, exId)
    }
  }

  this.doSearch = function (searchFor) {
    var searchValue = ""
    if (searchFor != undefined) {
      searchValue = searchFor
    } else {
      var searchInput = $("[name=searchfield]").val()
      searchValue = searchInput
    }
    if (searchValue === "" || typeof(searchValue) == "object" || !(/\S/.test(searchValue))) return
    
    var resultCount = 0
    try {
      var excercise_names = dmc.search_topics(null, searchValue, "tub.eduzen.excercise_name", false)
      resultCount += excercise_names.length
    } catch (err) { console.log("cathing name search error.. ") }
    try {
      var excercise_descs = dmc.search_topics(null, searchValue, "tub.eduzen.excercise_description", false)
      resultCount += excercise_descs.length
    } catch (err) { console.log("cathing description search error.. ") }
    var existing_enames = dmc.get_topics("tub.eduzen.excercise_name", false) // fixme: just to GET a count
    // var excercise_objects = dmc.search_topics(null, searchValue, "tub.eduzen.excercise_object", false)

    var resultObject = {
      size: resultCount, overallCount: existing_enames.items.length, searchFor: searchValue
    }
    // fixme: build up query object, too

    // updating gui after a query
    filter.showResultHeader(resultObject)
    filter.showResults(excercise_names.concat(excercise_descs))

    filter.push_history({"action": "dosearch", "parameter": resultObject}, "#dosearch?for=" + searchValue)
  }

  this.showResultHeader = function (rO) {
    if (rO.size == 0) {
      $("#result-count").html("Ihre Anfrage nach \"" + rO.searchFor + "\" lieferte keine Ergebnisse.")
      filter.emptyResultList()
      return
    }
    $("#result-count").html("Ihre Anfrage nach \"" + rO.searchFor + "\" lieferte <b>"
      + rO.size + "</b> von " + rO.overallCount + " insg. Aufgabenstellungen")
  }

  /** renders list of search resulting excercises with querying for each:
      - excercise_texts if not given
      - related topicalareas via excercise_texts
      - sample solutions via taken excercises
   **/
  this.showResults = function (rL) { // eats list of excercise_texts or list of excercise_names
    filter.emptyResultList()

    for (item in rL) { // for each result item
      var result = rL[item]
      var moreOutput = "<li id=\"" + result.id + "\" class=\"result-item\">"
        + "<a id=\"" + result.id + "\" href=\"javascript:void(0)\">" + result.value + "</a>"
      // taken the eText
      var hasSampleSolution = false
      var excerciseText = { items: new Array(), total_count: 1}
      if (result.type_uri === "tub.eduzen.excercise_text") {
        excerciseText.items.push(result)
      } else {
        excerciseText = dmc.get_related_topics(result.id, {"others_topic_type_uri": "tub.eduzen.excercise_text"})
      }

      if (excerciseText.items[0] != undefined) { // fixme: there should always be just one, so we`re taking the 1st
        exId = excerciseText.items[0].id
        // to get all taken excercises for this specific eText
        var excercises = dmc.get_related_topics(exId, {"others_topic_type_uri": "tub.eduzen.excercise"})
        if (excercises.total_count > 0) { //
          // console.log(excercises.items.length + " times taken " + excerciseText.items[0].value + " excercise")
          for (taken in excercises.items) { // get all approaches submitted to this excercise
            var excerciseId = excercises.items[taken].id
            var approaches = dmc.get_related_topics(excerciseId, {"others_topic_type_uri": "tub.eduzen.approach"})
            if (approaches.total_count > 0) { // find sample solutions..
              for (a in approaches.items) { // get all approaches marked as sample solution
                var approach = approaches.items[a]
                approach = dmc.get_topic_by_id(approach.id, true)
                if (approach.composite["tub.eduzen.approach_sample"].value) hasSampleSolution = true
              }
            } else {
              // console.log("no approaches submitted for eText " + excerciseText.items[0].value)
            }
          }
        } else {
          // console.log("no excercise taken for eText " + excerciseText.items[0].value)
        }
        // console.log("hasSampleSolution => " + hasSampleSolution)
        moreOutput += "<span class=\"sample-solution " + hasSampleSolution + "\">" + hasSampleSolution + "</span>"
          + "<span class=\"more-info\">ist <i>" + dict.typeName(result.type_uri) + "</i>"

        var topicalareas = dmc.get_related_topics(exId, {"others_topic_type_uri": "tub.eduzen.topicalarea"})
        if (topicalareas.total_count > 0) {
          moreOutput += "&nbsp;und ist verbunden mit dem/den <i class=\"label\">Themenkomplex(en):</i>"
          for (topic in topicalareas.items) {
            var topicalarea = topicalareas.items[topic]
            moreOutput += "<span class=\"associations\"><a class=\"topicalarea\" id=\"" + topicalarea.id
              + "\" href=\"javascript:filter.clickTopicalArea(" + topicalarea.id + ")\">"
              + topicalarea.value +"</a></span>"
          }
        }
      }
      moreOutput += "</span></li>"
      $("#result-list").append(moreOutput)
    }
    $(".result-item").click(filter.showResultItem); // fixme: registering multiple handler
  }

  this.emptyResultList = function () {
    $("#result-list").empty()
  }
  
  this.hideExcerciseView = function () {
    $(".excercise-view").hide()
  }

  this.showResultItem = function (e, id) {

    var exId = ""
    var targetId = undefined
    var result = undefined
    if (e != undefined) { // manually clicked
      targetId = parseInt(e.target.id)
      result = dmc.get_topic_by_id(targetId)
      var excerciseTopic = { items: new Array(), total_count: 1}
      if (result.type_uri === "tub.eduzen.excercise_text") {
        excerciseTopic.items.push(result)
      } else {
        excerciseTopic = dmc.get_related_topics(result.id, {"others_topic_type_uri": "tub.eduzen.excercise_text"})
      }
      if (excerciseTopic.items[0] != undefined) {
        exId = excerciseTopic.items[0].id
      } else {
        console.log("ERROR: cannot find related excercise_text for nodeId => " + targetId)
        exId = undefined
      }
    } else { // programmatically called showResultItem, yet unused
      exId = id
    }
    filter.showExcercise(exId, targetId)
    filter.push_history({"action": "doshow", "parameter": exId}, "#doshow?id=" + exId)
  }
  
  this.showExcercise = function (eId, tId) { // takes only list of excercise_names
    var parentRenderer = "#"
    var excercise = dmc.get_topic_by_id(eId)
    var nameOfExcercise = excercise.composite['tub.eduzen.excercise_name'].value
    var descriptionOfExcercise = excercise.composite['tub.eduzen.excercise_description'].value

    if (tId == undefined) { // programmatically clicked, show some result list first
      filter.showResults([excercise])
      // excerciseId is resultItemList.targetId
      filter.showExcercise(excercise.id, excercise.id) // simulate manual selection of resultItem
    } else {
      parentRenderer += tId // manually clicked, go on and toggle excercise in resultList
    }

    if ($(parentRenderer + " .excercise-view").length > 0) { // if excercise view was already loaded, just show it
      $(parentRenderer + " .excercise-view").toggle()
      return
    } else {
      $(parentRenderer + " .excercise-view").show()
    }

    var viewOutput = "<div class=\"excercise-view\" id=\"" + eId + "\">"
      viewOutput += "<span class=\"label\">Aufgabenstellung</span><br/>"
      // viewOutput += "<span class=\"name\"><a href=\"#doshow?id=" + excercise.id + "\" id=\""
        // + excercise.id + "\" >" + nameOfExcercise + "</a></span>"
      viewOutput += "<span class=\"description\">" + descriptionOfExcercise + "</span>"

      /** var pasteValue = nameOfExcercise + descriptionOfExcercise
      $("#page").append("<a href=\"javascript:filter.copyToClipboard("
        + pasteValue + ")\">copy + paste excercise</a>") */

      var excerciseObjects = dmc.get_related_topics(eId, {"assoc_type_uri": "tub.eduzen.compatible",
        "others_topic_type_uri": "tub.eduzen.excercise_object"})
      if (excerciseObjects.total_count > 0) {
        viewOutput += "<span class=\"label\">Dazu kompatible Aufgabenobjekte:</span><br/>"

        var objectString = "<ul class=\"objects\">"
        for (object in excerciseObjects.items) {
          var excerciseObject = excerciseObjects.items[object]
          objectString += "<li><a class=\"excercise-object\" id=\"" + excerciseObject.id
            + "\" href=\"javascript:filter.clickExcerciseObject(" + excerciseObject.id + ")\">"
            + excerciseObject.value +"</a></li>"
        }
        objectString += "</ul>"
        viewOutput += objectString
      }
      viewOutput += "</div>"
    $(parentRenderer).append(viewOutput)
    $(parentRenderer).show()

  }
  
  this.clickTopicalArea = function (topicalId) {
    var excerciseTexts = filter.get_excercises_by_topicalarea(topicalId)
    filter.showResults(excerciseTexts)
  }

  this.clickExcerciseObject = function (objectId) {
    console.log("doSomething with Excercise Object (" + objectId  + ")")
  }

  this.copyToClipboard = function (text) {
    window.prompt ("Copy to clipboard: STRG+C, Enter", text)
  }

  this.pop_history = function (state) {
    if (!filter.historyApiSupported) return
    console.log("popping_")
    console.log(state)
    if (state.action == "dosearch") {
      var searchValue = state.parameter.searchFor
      $("[name=searchfield]").val("" + searchValue + "")
      filter.doSearch(searchValue)
    } else if (state.action == "doshow") {
      var exId = state.parameter
      filter.showResultItem(undefined, exId)
    }
  }

  this.push_history = function (state, link) {
    if (!filter.historyApiSupported) return
    console.log("pushing_")
    console.log(state)
    var history_entry = {state: state, url: link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }

  this.get_excercises_by_topicalarea = function(id) {
    return dmc.request("GET", "/eduzen/excercise/by_topicalarea/" + id, undefined, undefined, undefined, false)
  }

  this.login = function(authorization) {

    var DEFAULT_USER = "admin"
    var DEFAULT_PASSWORD = ""
    var ENCRYPTED_PASSWORD_PREFIX = "-SHA256-" // don't change this
    var pwd = ENCRYPTED_PASSWORD_PREFIX + SHA256(DEFAULT_PASSWORD)
    var credentials = "admin:" + pwd

    return dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": "Basic "+ btoa(credentials)})
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

}

$(window).load(filter.initSearchView)
