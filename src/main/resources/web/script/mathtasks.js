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
      filter.showExcercise(exId)
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
      size: resultCount,
      overallCount: existing_enames.items.length,
      searchFor: searchValue
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

  this.showResults = function (rL) {
    filter.emptyResultList()

    for (item in rL) {
      var result = rL[item]
      $("#result-list").append("<li id=\"" + result.id + "\" class=\"result-item\">"
        + "<a id=\"" + result.id + "\" href=\"javascript:void(0)\">" + result.value + "</a>"
        + "<span class=\"more-info\">ist <i>" + dict.typeName(result.type_uri) + "</i></span></li>")
    }

    $(".result-item").click(filter.showResultItem); // fixme: registering multiple handler
  }

  this.emptyResultList = function () {
    $("#result-list").empty()
  }

  this.showResultItem = function (e, id) {
    var topicId = parseInt(e.target.id)
    var excerciseTopic = dmc.get_related_topics(topicId, {"others_topic_type_uri": "tub.eduzen.excercise_text"})

    if (excerciseTopic.items[0] != undefined) {
      var exId = excerciseTopic.items[0].id
      filter.showExcercise(exId)
      filter.push_history({"action": "doshow", "parameter": exId}, "#doshow?id=" + exId)
    } else {
      console.log("requested, related excerciseTopic is undefined.. ")
    }
  }
  
  this.showExcercise = function (eId) {
    var excercise = dmc.get_topic_by_id(eId)
    var nameOfExcercise = excercise.composite['tub.eduzen.excercise_name'].value
    var descriptionOfExcercise = excercise.composite['tub.eduzen.excercise_description'].value
    var objectOfExcercise = "" // TODO
    var pasteValue = nameOfExcercise + descriptionOfExcercise + objectOfExcercise
    $("#page").html("<span class=\"name\">" + nameOfExcercise + "</span>")
    $("#page").append("<span class=\"description\">" + descriptionOfExcercise + "</span>")
    /** $("#page").append("<a href=\"javascript:filter.copyToClipboard("
      + pasteValue + ")\">copy + paste excercise</a>") */
    $("#page").show()

    var topicalareas = dmc.get_related_topics(excercise.id, {"others_topic_type_uri": "tub.eduzen.topicalarea"})
    for (topic in topicalareas.items) {
      var topicalarea = topicalareas.items[topic]
      $("#page").append("<span class=\"associations\">"
        + "<a class=\"topicalarea\" id=\"" + topicalarea.id
        + "\" href=\"javascript:filter.clickTopicalArea(" + topicalarea.id + ")\">"
        + topicalarea.value +"</a></span>")
    }
  }
  
  this.clickTopicalArea = function (topicalId) {
    console.log("doSomething with " + topicalId)
  }
  
  this.copyToClipboard = function (text) {
    window.prompt ("Copy to clipboard: STRG+C, Enter", text)
  }

  this.pop_history = function (state) {
    if (!filter.historyApiSupported) return

    if (state.action == "dosearch") {
      var searchValue = state.parameter.searchFor
      $("[name=searchfield]").val("" + searchValue + "")
      filter.doSearch(searchValue)
    } else if (state.action == "doshow") {
      var id = state.parameter
      filter.showExcercise(id)
    }
  }

  this.push_history = function (state, link) {
    if (!filter.historyApiSupported) return

    var history_entry = {state: state, url: "de.tu-berlin.eduzen.tasks" + link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }

}

$(window).load(filter.initSearchView)
