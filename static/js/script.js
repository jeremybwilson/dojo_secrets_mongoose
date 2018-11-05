$(document).ready(() => {

    $('#registration_form').submit(function(e) {
        console.log('request.body information from jquery: ', request.body);
        e.preventDefault();
        // const author = $('input').val();
        // const message = $('password').val();
        // const content = { name:author, message:message };
        // $.ajax({
        //     url: $(this).attr('action'),
        //     method: 'POST',
        //     data: content,
        //     success: (response) => {
        //         if (response.code === 406) {
        //             for (let error of response.errors) {
        //                 $('#flash_msg').append(`<p class="error_msg">${error}</p>`)
        //             }
        //         } else {
        //             for (let message of response.messages) {

        //                 $('#messageboard').append(
        //                     `<div class="card">
        //                         <p class="card-header">${message.name}
        //                         <div class="card-body">
        //                             <p class="card-text">${message.message}</p></p>
        //                         </div>
        //                         <div class="${message._id}"></div>
        //                         <div class="card-footer">
        //                             <form class="comment_form" action="comment/${message._id}" method="POST">
        //                                 Name:<input class="signature" type="text", name="signature">
        //                                 Comment:<input class="comment" type="text", name="comment">
        //                                 <button class='btn btn-primary btn-sm'>Submit</button>
        //                             </form>
        //                         </div>
        //                     </div>`)
        //                 if (message.comments.length > 0) {
        //                     for (let comment of message.comments) {
        //                         let htmlStr = `
        //                         <div class="card-body border-secondary text-secondary">
        //                             <p class="card-header p-0">${comment.signature}</p>
        //                             <p class="card-text p-1">${comment.comment}</p>
        //                         </div>
        //                         `;
        //                        $('.'+message._id+'').append(htmlStr);
        //                     };
        //                 };
        //             };
        //         };
        //     }
        // });//end of $.ajax
    });//end of registration_form .submit
    $(document).on('submit','form', (e) => {
        e.preventDefault();
        const name = $('#email').val();
        const password = $('#password').val();
        const content = { email: email, password:password };
        console.log('Here is the submitted form content: ', content);
    })
});//end of jQuery!!

