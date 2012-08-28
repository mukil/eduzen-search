package de.deepamehta.plugins.eduzen.filterview;

import java.util.logging.Logger;
import java.util.Set;

import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.TopicModel;
import de.deepamehta.core.service.ClientState;
import de.deepamehta.core.osgi.PluginActivator;
import de.deepamehta.plugins.eduzen.filterview.service.ExcerciseFilterViewService;

@Path("/eduzen/excercise")
@Produces("application/json")
public class ExcerciseFilterViewPlugin extends PluginActivator implements ExcerciseFilterViewService {

    private Logger log = Logger.getLogger(getClass().getName());

    public ExcerciseFilterViewPlugin() {
        log.info(".stdOut(\"Hello Zen-Master!\")");
    }

    @GET
    @Path("/by_topicalarea/{id}")
    @Override
    public Set<RelatedTopic> getExcerciseTextsByTopicalArea(@PathParam("id") long id,
        @HeaderParam("Cookie") ClientState clientState) {

        Topic topic = dms.getTopic(id, false, null);
        return topic.getRelatedTopics("tub.eduzen.requirement", "dm4.core.default", "dm4.core.default",
            "tub.eduzen.excercise_text", false, false, 0, null).getItems();
    }
    

}
